import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { normalizeUnitCount } from "./src/unitLimits";

// .env.local takes priority (dotenv.config never overwrites a key already
// set in process.env, so loading it first lets it win over .env).
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const devSecretsFile = path.join(process.cwd(), ".renziy-data", ".dev-secrets.json");

const loadDevSecrets = (): Record<string, string> => {
  try {
    return JSON.parse(fs.readFileSync(devSecretsFile, "utf8"));
  } catch {
    return {};
  }
};

const saveDevSecret = (key: string, value: string) => {
  try {
    fs.mkdirSync(path.dirname(devSecretsFile), { recursive: true });
    const secrets = loadDevSecrets();
    secrets[key] = value;
    fs.writeFileSync(devSecretsFile, JSON.stringify(secrets, null, 2), "utf8");
  } catch (err) {
    console.warn("Unable to persist generated dev secret:", err);
  }
};

// Session signing and password hashing must never fall back to a value that's
// public in this repo. Refuse to start in production without a real secret;
// in development, generate one once and persist it locally (gitignored) so
// sessions and password hashes survive a dev server restart.
const requireSecret = (envName: string): string => {
  const fromEnv = process.env[envName];
  if (fromEnv) return fromEnv;
  if (isProduction) {
    throw new Error(`${envName} must be set in production. Refusing to start with a default secret.`);
  }
  const existing = loadDevSecrets()[envName];
  if (existing) return existing;
  const generated = crypto.randomBytes(32).toString("hex");
  saveDevSecret(envName, generated);
  console.warn(`[dev] ${envName} not set - generated a random development secret (saved to .renziy-data/.dev-secrets.json, which is gitignored). Set ${envName} explicitly before deploying.`);
  return generated;
};

// Unlike requireSecret(), there's no sensible random fallback for an external
// service credential - if it's missing, fail loudly in both dev and prod.
const requireEnv = (envName: string): string => {
  const value = process.env[envName];
  if (!value) {
    throw new Error(`${envName} must be set. Add it to .env.local (dev) or your deployment's environment variables.`);
  }
  return value;
};

// fullResults: true makes .query() return { rows, ... } (like node-postgres)
// instead of just an array of rows.
const sql = neon(requireEnv("POSTGRES_URL"), { fullResults: true });

// Optional, not requireEnv()'d - if it's missing, password-reset codes just
// fall back to the console.log-only behavior (fine for local dev without a
// Resend account set up yet). Set it in production to actually email codes.
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const resetEmailFrom = process.env.RESET_EMAIL_FROM || "Renziy <onboarding@resend.dev>";
if (isProduction && !resend) {
  console.warn("[startup] RESEND_API_KEY not set - password reset codes will only be logged, never emailed.");
}

// --- Tiny SQL helper layer -------------------------------------------------
// A hand-rolled, minimal stand-in for the Postgres query builder this file
// used to get for free from Supabase's JS client. It only supports the exact
// operations this file actually needs (equality/inequality/IN filters,
// select/insert/update/delete, upsert-if-missing) - not a general ORM.

type WhereClause = [column: string, op: "=" | "!=" | "IN", value: unknown];

// jsonb columns (amenities, photos, settlementConfig) need their JS
// array/object value JSON-stringified before going out as a bind parameter -
// the driver won't do this coercion itself. `undefined` (an absent optional
// field) becomes SQL NULL, matching how these fields behave when unset.
const toSqlParam = (value: unknown): unknown => {
  if (value === undefined) return null;
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return value;
};

const buildWhere = (where: WhereClause[], paramOffset = 0): { clause: string; params: unknown[] } => {
  if (where.length === 0) return { clause: "", params: [] };
  const parts = where.map(([column, op], i) => {
    const index = paramOffset + i + 1;
    return op === "IN" ? `"${column}" = ANY($${index}::text[])` : `"${column}" ${op} $${index}`;
  });
  // IN params stay a raw JS array for the driver's native array binding
  // (= ANY($n::text[])) - running them through toSqlParam would JSON.stringify
  // the array into "[...]", which Postgres rejects as a malformed array literal.
  const params = where.map(([, op, value]) => (op === "IN" ? value : toSqlParam(value)));
  return { clause: ` WHERE ${parts.join(" AND ")}`, params };
};

const selectRows = async <T = any>(
  table: string,
  where: WhereClause[] = [],
  opts: { orderBy?: string; desc?: boolean } = {}
): Promise<T[]> => {
  const { clause, params } = buildWhere(where);
  const order = opts.orderBy ? ` ORDER BY "${opts.orderBy}" ${opts.desc ? "DESC" : "ASC"}` : "";
  const { rows } = await sql.query(`SELECT * FROM ${table}${clause}${order}`, params);
  return rows as T[];
};

const selectOne = async <T = any>(table: string, where: WhereClause[]): Promise<T | null> => {
  const rows = await selectRows<T>(table, where);
  return rows[0] ?? null;
};

const countRows = async (table: string, where: WhereClause[] = []): Promise<number> => {
  const { clause, params } = buildWhere(where);
  const { rows } = await sql.query(`SELECT COUNT(*)::int AS count FROM ${table}${clause}`, params);
  return rows[0].count as number;
};

// `object` (not Record<string, unknown>) so this accepts any of the app's
// concrete interfaces (Property, Unit, ...) without needing an index
// signature on every one of them - the cast to Record here is what actually
// does the by-key lookups.
const insertRow = async <T = any>(table: string, row: object): Promise<T> => {
  const record = row as Record<string, unknown>;
  const columns = Object.keys(record);
  const columnList = columns.map(c => `"${c}"`).join(", ");
  const values = columns.map(c => toSqlParam(record[c]));
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await sql.query(`INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) RETURNING *`, values);
  return rows[0] as T;
};

// Rows in a batch don't all have to share the same keys (e.g. seed units
// where only some have a tenantName) - the column list is the union across
// every row, and a row missing a given key just gets NULL for it.
const unionColumns = (rows: object[]): string[] => {
  const columns = new Set<string>();
  rows.forEach(row => Object.keys(row).forEach(key => columns.add(key)));
  return Array.from(columns);
};

const insertRows = async (table: string, rowsToInsert: object[]): Promise<void> => {
  if (rowsToInsert.length === 0) return;
  const records = rowsToInsert as Record<string, unknown>[];
  const columns = unionColumns(records);
  const columnList = columns.map(c => `"${c}"`).join(", ");
  const values: unknown[] = [];
  const tuples = records.map(row => (
    `(${columns.map(c => {
      values.push(toSqlParam(row[c]));
      return `$${values.length}`;
    }).join(", ")})`
  ));
  await sql.query(`INSERT INTO ${table} (${columnList}) VALUES ${tuples.join(", ")}`, values);
};

// "Insert if missing" - never overwrites a row that's already there (used
// for seeding, so re-running it on every cold start can't clobber real data
// a user has since changed).
const upsertIgnoreDuplicates = async (table: string, rowsToInsert: object[], conflictColumn: string): Promise<void> => {
  if (rowsToInsert.length === 0) return;
  const records = rowsToInsert as Record<string, unknown>[];
  const columns = unionColumns(records);
  const columnList = columns.map(c => `"${c}"`).join(", ");
  const values: unknown[] = [];
  const tuples = records.map(row => (
    `(${columns.map(c => {
      values.push(toSqlParam(row[c]));
      return `$${values.length}`;
    }).join(", ")})`
  ));
  await sql.query(
    `INSERT INTO ${table} (${columnList}) VALUES ${tuples.join(", ")} ON CONFLICT ("${conflictColumn}") DO NOTHING`,
    values
  );
};

const updateRows = async <T = any>(table: string, patch: object, where: WhereClause[]): Promise<T[]> => {
  const record = patch as Record<string, unknown>;
  const columns = Object.keys(record);
  const setClause = columns.map((c, i) => `"${c}" = $${i + 1}`).join(", ");
  const { clause, params: whereParams } = buildWhere(where, columns.length);
  const values = [...columns.map(c => toSqlParam(record[c])), ...whereParams];
  const { rows } = await sql.query(`UPDATE ${table} SET ${setClause}${clause} RETURNING *`, values);
  return rows as T[];
};

const updateOne = async <T = any>(table: string, patch: object, where: WhereClause[]): Promise<T | null> => {
  const rows = await updateRows<T>(table, patch, where);
  return rows[0] ?? null;
};

const deleteRows = async (table: string, where: WhereClause[]): Promise<void> => {
  const { clause, params } = buildWhere(where);
  await sql.query(`DELETE FROM ${table}${clause}`, params);
};

// --- End SQL helper layer ---------------------------------------------------

const seedAccountPassword = process.env.RENZIY_SEED_PASSWORD || crypto.randomBytes(18).toString("base64url");
const adminAccountEmail = (process.env.RENZIY_ADMIN_EMAIL || "admin@renziy.app").trim().toLowerCase();
const adminAccountPassword = process.env.RENZIY_ADMIN_PASSWORD || (() => {
  const generated = crypto.randomBytes(12).toString("base64url");
  console.warn(`[dev] RENZIY_ADMIN_PASSWORD not set - generated one-time admin password: ${generated}. Set RENZIY_ADMIN_PASSWORD before deploying.`);
  return generated;
})();

interface Property {
  id: string;
  name: string;
  address: string;
  unitsCount: number;
  imageUrl?: string;
  county?: string;
  constituency?: string;
  town?: string;
  neighborhood?: string;
  specificLocation?: string;
  description?: string;
  amenities?: string[];
  contactPhone?: string;
  mapQuery?: string;
  availableForMarketplace?: boolean;
  ownerEmail?: string;
}

interface Unit {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  rentAmount: number;
  status: 'Occupied' | 'Vacant';
  tenantName?: string;
  tenantAvatar?: string;
  isLocked?: boolean;
  lockReason?: string;
}

interface Payment {
  id: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentMethod: 'M-Pesa' | 'Card';
  code: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  category: string;
  urgency: 'Low' | 'Med' | 'High' | 'Emergency';
  description: string;
  status: 'Submitted' | 'Acknowledged' | 'In Progress' | 'Resolved';
  date: string;
  photos: string[];
  technicianName?: string;
  technicianEmail?: string;
  technicianPhone?: string;
  technicianAvatar?: string;
  arrivalTime?: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: string;
  unread: boolean;
}

interface PlatformMember {
  id: string;
  role: 'admin' | 'landlord' | 'tenant' | 'worker';
  name: string;
  phone: string;
  email: string;
  password?: string;
  passwordHash?: string;
  avatarUrl?: string;
  propertyName?: string;
  unitNumber?: string;
  rentAmount?: number;
  specialty?: string;
  joinDate: string;
  status: 'Active' | 'Pending Review';
}

interface RentalApplication {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  rentAmount: number;
  ownerEmail?: string;
  ownerPhone?: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  requestedAt: string;
  status: 'Awaiting Rent' | 'Rent Paid' | 'Approved' | 'Declined';
  paymentCode?: string;
  approvedAt?: string;
}

interface SettlementConfig {
  mpesaType: 'Paybill' | 'BuyGoods' | 'PhoneNumber';
  mpesaDetails: string;
  mpesaAccountName: string;
  paybillAccount?: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankRoutingCode: string;
}

// Seed/demo data, upserted into Postgres on boot if not already present
// (see ensureSeedData below) - not live mutable state anymore.
const SEED_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    name: 'Oakwood Heights',
    address: 'Kilimani, Nairobi',
    unitsCount: 12,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMxFypFJhzOCuTAq-LcLtvR4Y7ZY9bY54rSM8H5Fph0ckllantEW12QMfxkKgv07Su36d4tFLU3AqPcLAg7Uj-BF4VrVmqEQtJTgcSdEOVOJR7FN14v_XogFaT2Gh3ZDnn-3pdKTnjX7MMoWaR3HgkJfPnUgLFsheBufag0UlCJfG5PFlA5TI0pYMNgmvP6PIXX1tp8LQmTtcB59pPvkG6Eh3F9Kgp-60KmmEDPmeQYry0nEDmGA89799YSjmtXbz-EJn_uGWto2ku',
    county: 'Nairobi',
    constituency: 'Dagoretti North',
    town: 'Kilimani',
    neighborhood: 'Near Yaya Centre',
    specificLocation: 'Yaya Centre, Argwings Kodhek Road',
    description: 'Managed apartments close to shopping, transport, schools, and everyday services.',
    amenities: ['Security', 'Parking', 'Water', 'Wi-Fi ready', 'Near public transport'],
    contactPhone: '0743475247',
    mapQuery: 'Kilimani Nairobi Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-2',
    name: 'Harbor View Villas',
    address: 'Nyali, Mombasa',
    unitsCount: 8,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0-lP6mcA6HIE4LbzTr765rwiEop89MIpJdvoyF11DN-epOhG7wzLR2vlsvvbIs-eHfUJNUdibFBNajQHHbWzJeqHMFacPNozVQz5c_cpg8uv7fiB71TnE1n_AKhKhic2o8RClwzPHlK1tGsw0MkRGgTOyoCDxd_DliMftNntarn6QL0T4rOntvVbWuKWKfj7-n8nt8R7oxKRysKqzqbaLI_o1dRnqkJ-65xCIUfuKl4jxyeydhAO2IpAgSOxBrOIkfgdT45kPYn1w',
    county: 'Mombasa',
    constituency: 'Nyali',
    town: 'Nyali',
    neighborhood: 'Near Links Road',
    specificLocation: 'Links Road near City Mall',
    description: 'Coastal rental homes with quick access to beach areas, malls, and public transport.',
    amenities: ['Security', 'Parking', 'Balcony', 'Water', 'Near beach'],
    contactPhone: '0743475247',
    mapQuery: 'Nyali Mombasa Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-3',
    name: 'The Landmark Plaza',
    address: 'Westlands, Nairobi',
    unitsCount: 24,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDeFWF3TQaKiLEBRJtArgPXu09QtvyqQs-gb3Zt7iYlExPtNsZbIyaRrqyH-ukWCzFv775NWuT8V7XiXreNauV2xQTQdHb02QW_oN7OP1jp1g7Q4rJabYd5OQaedPKghFW7rMjA694Z2xEjSk44lalS6SdzWfG0I8_cLy9cCtqUZ2tP3vBmMM48q3UOStup7tWS9k1qdRLWjO2VFDULs8B0ngFXh-V-Gqp2JwMn5DH6oKY48I-GpOgw6M5_Xr0K1Gx7vkKDB417LOey',
    county: 'Nairobi',
    constituency: 'Westlands',
    town: 'Westlands',
    neighborhood: 'Near Waiyaki Way',
    specificLocation: 'Westlands business district',
    description: 'Mixed-use units for tenants who want quick access to Nairobi business corridors.',
    amenities: ['Lift access', 'Security', 'Backup power', 'Parking', 'CBD access'],
    contactPhone: '0743475247',
    mapQuery: 'Westlands Nairobi Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-4',
    name: "Le'Mac Residences",
    address: 'Waiyaki Way, Westlands, Nairobi',
    unitsCount: 10,
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    county: 'Nairobi',
    constituency: 'Westlands',
    town: 'Westlands',
    neighborhood: 'Near ABC Place',
    specificLocation: 'Waiyaki Way, Westlands',
    description: "High-rise Westlands homes inspired by Le'Mac's mixed-use residential tower profile, with city access, lift service, and lifestyle amenities.",
    amenities: ['Lift access', 'Gym', 'Backup power', 'Security', 'Parking'],
    contactPhone: '0743475247',
    mapQuery: "Le'Mac Westlands Nairobi Kenya",
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-5',
    name: 'Greenpark Athi River Homes',
    address: 'Athi River, Machakos',
    unitsCount: 16,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    county: 'Machakos',
    constituency: 'Mavoko',
    town: 'Athi River',
    neighborhood: 'Near Mombasa Road',
    specificLocation: 'Greenpark Estate area, Athi River',
    description: 'Family-friendly homes inspired by the well-known Greenpark development corridor near Nairobi, with quieter living and road access.',
    amenities: ['Parking', 'Garden court', 'Security', 'Water', 'Family estate'],
    contactPhone: '0743475247',
    mapQuery: 'Greenpark Athi River Machakos Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-6',
    name: 'Madaraka City Flats',
    address: 'Madaraka Estate, Nairobi',
    unitsCount: 14,
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    county: 'Nairobi',
    constituency: 'Langata',
    town: 'Madaraka',
    neighborhood: 'Near Nyayo National Stadium',
    specificLocation: 'Ole Sangale Road, Madaraka',
    description: 'Practical city flats inspired by Madaraka Estate, close to CBD routes, universities, stadium access, and everyday services.',
    amenities: ['Near CBD', 'Public transport', 'Water', 'Security', 'Schools nearby'],
    contactPhone: '0743475247',
    mapQuery: 'Madaraka Estate Nairobi Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-7',
    name: 'Nyali Beach Apartments',
    address: 'Nyali, Mombasa',
    unitsCount: 12,
    imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    county: 'Mombasa',
    constituency: 'Nyali',
    town: 'Nyali',
    neighborhood: 'Near Nyali Beach',
    specificLocation: 'Nyali beach residential belt',
    description: 'Coastal apartments inspired by Nyali, with quick access to malls, beach roads, and resort-style residential services.',
    amenities: ['Near beach', 'Balcony', 'Parking', 'Security', 'Water'],
    contactPhone: '0743475247',
    mapQuery: 'Nyali Beach Mombasa Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-8',
    name: 'Kileleshwa Court Apartments',
    address: 'Kileleshwa, Nairobi',
    unitsCount: 10,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    county: 'Nairobi',
    constituency: 'Dagoretti North',
    town: 'Kileleshwa',
    neighborhood: 'Near Kileleshwa Ring Road',
    specificLocation: 'Off Gatundu Road, Kileleshwa',
    description: 'Quiet leafy apartments near Kileleshwa Ring Road, a short drive from Westlands and Lavington shopping centres.',
    amenities: ['Security', 'Parking', 'Backup power', 'Water', 'Wi-Fi ready'],
    contactPhone: '0743475247',
    mapQuery: 'Kileleshwa Nairobi Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-9',
    name: 'Lavington Green Residences',
    address: 'Lavington, Nairobi',
    unitsCount: 8,
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    county: 'Nairobi',
    constituency: 'Dagoretti North',
    town: 'Lavington',
    neighborhood: 'Near Lavington Mall',
    specificLocation: 'James Gichuru Road, Lavington',
    description: 'Established Lavington apartments close to James Gichuru Road, Lavington Mall, and international schools.',
    amenities: ['Security', 'Parking', 'Garden', 'Backup power', 'CCTV'],
    contactPhone: '0743475247',
    mapQuery: 'Lavington Nairobi Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-10',
    name: 'Karen Manor Homes',
    address: 'Karen, Nairobi',
    unitsCount: 6,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    county: 'Nairobi',
    constituency: 'Langata',
    town: 'Karen',
    neighborhood: 'Near Karen Blixen Museum',
    specificLocation: 'Karen Road, near Hardy shopping centre',
    description: 'Spacious standalone homes on generous plots in Karen, close to Hardy shopping centre and the Nairobi National Park boundary.',
    amenities: ['Garden', 'Security', 'Parking', 'Borehole water', 'Staff quarters'],
    contactPhone: '0743475247',
    mapQuery: 'Karen Nairobi Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-11',
    name: 'South B Sunrise Apartments',
    address: 'South B, Nairobi',
    unitsCount: 16,
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    county: 'Nairobi',
    constituency: 'Makadara',
    town: 'South B',
    neighborhood: 'Near South B shopping centre',
    specificLocation: 'Muhoho Avenue, South B',
    description: 'Affordable family apartments in South B with quick access to the CBD, Nyayo Stadium, and Mater Hospital.',
    amenities: ['Security', 'Parking', 'Water', 'Near public transport'],
    contactPhone: '0743475247',
    mapQuery: 'South B Nairobi Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-12',
    name: 'Ruaka Riverside Apartments',
    address: 'Ruaka, Kiambu',
    unitsCount: 20,
    imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    county: 'Kiambu',
    constituency: 'Kiambaa',
    town: 'Ruaka',
    neighborhood: 'Near Two Rivers Mall',
    specificLocation: 'Ruaka town, off Limuru Road near Two Rivers Mall',
    description: 'Fast-growing Ruaka apartments minutes from Two Rivers Mall and the Nairobi-Limuru Road, popular with young professionals.',
    amenities: ['Security', 'Parking', 'Water', 'Backup power', 'Near matatu stage'],
    contactPhone: '0743475247',
    mapQuery: 'Ruaka Kiambu Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-13',
    name: 'Kitengela Meadows',
    address: 'Kitengela, Kajiado',
    unitsCount: 12,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    county: 'Kajiado',
    constituency: 'Kajiado East',
    town: 'Kitengela',
    neighborhood: 'Near Kitengela town centre',
    specificLocation: 'Along Namanga Road, Kitengela',
    description: 'Budget-friendly Kitengela homes along Namanga Road, well suited to commuters using the Nairobi-Namanga corridor.',
    amenities: ['Security', 'Parking', 'Water', 'Family estate'],
    contactPhone: '0743475247',
    mapQuery: 'Kitengela Kajiado Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-14',
    name: 'Ongata Rongai Heights',
    address: 'Ongata Rongai, Kajiado',
    unitsCount: 14,
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    county: 'Kajiado',
    constituency: 'Kajiado North',
    town: 'Ongata Rongai',
    neighborhood: 'Near Rongai town centre',
    specificLocation: 'Off Magadi Road, Ongata Rongai',
    description: 'Popular Rongai apartments off Magadi Road, close to the town centre market and regular matatus into Nairobi CBD.',
    amenities: ['Security', 'Parking', 'Water', 'Near public transport'],
    contactPhone: '0743475247',
    mapQuery: 'Ongata Rongai Kajiado Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-15',
    name: 'Thika Road Business Suites',
    address: 'Makongeni, Thika',
    unitsCount: 10,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    county: 'Kiambu',
    constituency: 'Thika Town',
    town: 'Thika',
    neighborhood: 'Near Makongeni estate',
    specificLocation: 'Makongeni, off Thika Superhighway',
    description: 'Practical Thika apartments near Makongeni estate, a short ride from Thika Superhighway and the town’s industrial area.',
    amenities: ['Security', 'Parking', 'Water', 'Near public transport'],
    contactPhone: '0743475247',
    mapQuery: 'Makongeni Thika Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-16',
    name: 'Bamburi Beach Cottages',
    address: 'Bamburi, Mombasa',
    unitsCount: 9,
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    county: 'Mombasa',
    constituency: 'Kisauni',
    town: 'Bamburi',
    neighborhood: 'Near Bamburi Beach',
    specificLocation: 'Off Malindi Road, Bamburi',
    description: 'Coastal cottages near Bamburi Beach and Nyali-Bamburi shopping strip, with easy access to Mombasa-Malindi Road.',
    amenities: ['Near beach', 'Security', 'Parking', 'Water', 'Backup power'],
    contactPhone: '0743475247',
    mapQuery: 'Bamburi Mombasa Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-17',
    name: 'Diani Palm Villas',
    address: 'Diani Beach, Kwale',
    unitsCount: 6,
    imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    county: 'Kwale',
    constituency: 'Matuga',
    town: 'Diani',
    neighborhood: 'Near Diani Beach Road',
    specificLocation: 'Diani Beach Road, near Ukunda',
    description: 'Palm-shaded villas a short walk from Diani Beach Road, popular with long-stay tenants working near Ukunda.',
    amenities: ['Near beach', 'Garden', 'Security', 'Parking', 'Backup power'],
    contactPhone: '0743475247',
    mapQuery: 'Diani Beach Kwale Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-18',
    name: 'Kisumu Milimani Residences',
    address: 'Milimani, Kisumu',
    unitsCount: 12,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    county: 'Kisumu',
    constituency: 'Kisumu Central',
    town: 'Milimani',
    neighborhood: 'Near Milimani estate',
    specificLocation: 'Milimani estate, near Kisumu CBD',
    description: 'Established Milimani apartments close to Kisumu CBD, the Kisumu Yacht Club, and Jomo Kenyatta Sports Ground.',
    amenities: ['Security', 'Parking', 'Water', 'Garden', 'Backup power'],
    contactPhone: '0743475247',
    mapQuery: 'Milimani Kisumu Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-19',
    name: 'Nakuru Milimani Apartments',
    address: 'Milimani, Nakuru',
    unitsCount: 14,
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    county: 'Nakuru',
    constituency: 'Nakuru Town West',
    town: 'Milimani',
    neighborhood: 'Near Nakuru Milimani estate',
    specificLocation: 'Milimani estate, near Nakuru CBD',
    description: 'Central Nakuru apartments in Milimani estate, walking distance to Nakuru CBD, schools, and Afraha Stadium.',
    amenities: ['Security', 'Parking', 'Water', 'Near public transport'],
    contactPhone: '0743475247',
    mapQuery: 'Milimani Nakuru Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-20',
    name: 'Eldoret Elgon View Apartments',
    address: 'Elgon View, Eldoret',
    unitsCount: 11,
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    county: 'Uasin Gishu',
    constituency: 'Kesses',
    town: 'Eldoret CBD',
    neighborhood: 'Elgon View',
    specificLocation: 'Elgon View, near Eldoret town centre',
    description: 'Well-regarded Elgon View apartments close to Eldoret town centre, Moi University town campus, and Rupa Mall.',
    amenities: ['Security', 'Parking', 'Water', 'Garden'],
    contactPhone: '0743475247',
    mapQuery: 'Elgon View Eldoret Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  },
  {
    id: 'prop-21',
    name: 'Naivasha Lake View Cottages',
    address: 'Naivasha, Nakuru',
    unitsCount: 8,
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    county: 'Nakuru',
    constituency: 'Naivasha',
    town: 'Naivasha',
    neighborhood: 'Near Lake Naivasha',
    specificLocation: 'Moi North Lake Road, Naivasha',
    description: 'Cottages near Lake Naivasha and Moi North Lake Road, convenient for tenants working around the flower farms and town centre.',
    amenities: ['Garden', 'Security', 'Parking', 'Water', 'Borehole water'],
    contactPhone: '0743475247',
    mapQuery: 'Naivasha Nakuru Kenya',
    availableForMarketplace: true,
    ownerEmail: 'john@renziy.app'
  }
];

const SEED_UNITS: Unit[] = [
  { id: 'unit-1-101', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '101', rentAmount: 245000, status: 'Occupied', tenantName: 'Marcus Holloway', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9IoAcZLIY0gg8i6wPLcaY3ygBvaVJvW0PmG_h9U1cLAEnC0k1pah2rUmQdxTTwa2PZ2ZtDP8Qbjz2M8PTiLhaD3eXimlHnDekaQo093rGsmlvzC2rSthGOw2zEnPAvVYQsrYRRKAQ9Gbw7B8zo0HOWZaNpGzs2GKDB0DMjAlrYYqWc8XGfrZe7J-31LzJjZLfre2xMwa0HVge2uvWbsZahdZT1ShrALJgRNBMESkjZV3xRa47RCCNOORnjWwDOBmDJCnFaGCi7do5' },
  { id: 'unit-1-102', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '102', rentAmount: 245000, status: 'Vacant' },
  { id: 'unit-1-201', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '201', rentAmount: 280000, status: 'Occupied', tenantName: 'Sarah Jenkins', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeMCNZyBiv-uiHtktmPVRPIpRrze2myHUqEyGKigO5LZgeu3-EP7_Ty-m4mB5GIZTneHA6G-KXG6hVHQz1wC3Gb-bT7Q82sDQKB583GkhdMFG5ZclHw4rl4_BK6sYi_QlxOSprJxAcqXMjWz41BAsUl0DXfLpJUZzgtVSzWKgHFpIf-UO6uiopeFa1h7QMxeZudiyqMMy-3IfrzO_ApWV77rRsYhROsYt2He4hGzWEBLPhQqKpdKovJWb_O96JJmbHQQbiK7HkM2bH' },
  { id: 'unit-1-202', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: '202', rentAmount: 280000, status: 'Occupied', tenantName: 'Liam Carter', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY1CTvj3PmtB3-LR_p1s4FNqaP67e_JoWovsuzRp3hatwF4Yg7LrghoPHFR3QODAlxjD9QQF_sIEDYVU0fbJWPhNa9W2QSz2JRCYA5eMWJxLkMcl5HZUURA8kXnfeVXbb8RDc4AW9wvm_SmqyHEv3RQTjcPXHaNL0e2CgaBh6Y4LbLxHaykUfOjEK0DWINHnO5M6EI-CV5VHBoeBuiVQ-kXneHEpi0m6_MM0suuhUZbRzMc1qz4fBdIKQaFE10mTnPsr6OA7lENt6E' },
  { id: 'unit-1-4b', propertyId: 'prop-1', propertyName: 'Oakwood Heights', unitNumber: 'Apt 4B', rentAmount: 145000, status: 'Occupied', tenantName: 'Alex Smith', tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' },

  { id: 'unit-2-1', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 1', rentAmount: 195000, status: 'Occupied', tenantName: 'Jane Doe' },
  { id: 'unit-2-2', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 2', rentAmount: 195000, status: 'Occupied', tenantName: 'Mark Smith' },
  { id: 'unit-2-3', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 3', rentAmount: 210000, status: 'Occupied', tenantName: 'Lucia Rivera' },
  { id: 'unit-2-4', propertyId: 'prop-2', propertyName: 'Harbor View Villas', unitNumber: 'Unit 4', rentAmount: 210000, status: 'Vacant' },

  { id: 'unit-3-1', propertyId: 'prop-3', propertyName: 'The Landmark Plaza', unitNumber: 'Suite A', rentAmount: 450000, status: 'Occupied', tenantName: 'Tom Brown' },
  { id: 'unit-3-2', propertyId: 'prop-3', propertyName: 'The Landmark Plaza', unitNumber: 'Suite B', rentAmount: 450000, status: 'Vacant' },
  { id: 'unit-4-1201', propertyId: 'prop-4', propertyName: "Le'Mac Residences", unitNumber: '1201', rentAmount: 265000, status: 'Vacant' },
  { id: 'unit-4-1603', propertyId: 'prop-4', propertyName: "Le'Mac Residences", unitNumber: '1603', rentAmount: 315000, status: 'Vacant' },
  { id: 'unit-5-b08', propertyId: 'prop-5', propertyName: 'Greenpark Athi River Homes', unitNumber: 'B-08', rentAmount: 95000, status: 'Vacant' },
  { id: 'unit-5-c14', propertyId: 'prop-5', propertyName: 'Greenpark Athi River Homes', unitNumber: 'C-14', rentAmount: 125000, status: 'Vacant' },
  { id: 'unit-6-f12', propertyId: 'prop-6', propertyName: 'Madaraka City Flats', unitNumber: 'F-12', rentAmount: 78000, status: 'Vacant' },
  { id: 'unit-6-g03', propertyId: 'prop-6', propertyName: 'Madaraka City Flats', unitNumber: 'G-03', rentAmount: 88000, status: 'Vacant' },
  { id: 'unit-7-a2', propertyId: 'prop-7', propertyName: 'Nyali Beach Apartments', unitNumber: 'A-2', rentAmount: 135000, status: 'Vacant' },
  { id: 'unit-7-p1', propertyId: 'prop-7', propertyName: 'Nyali Beach Apartments', unitNumber: 'Penthouse 1', rentAmount: 260000, status: 'Vacant' },

  { id: 'unit-8-1a', propertyId: 'prop-8', propertyName: 'Kileleshwa Court Apartments', unitNumber: '1A', rentAmount: 48000, status: 'Occupied', tenantName: 'Grace Wanjiru' },
  { id: 'unit-8-2b', propertyId: 'prop-8', propertyName: 'Kileleshwa Court Apartments', unitNumber: '2B', rentAmount: 75000, status: 'Vacant' },
  { id: 'unit-8-3c', propertyId: 'prop-8', propertyName: 'Kileleshwa Court Apartments', unitNumber: '3C', rentAmount: 110000, status: 'Vacant' },

  { id: 'unit-9-a1', propertyId: 'prop-9', propertyName: 'Lavington Green Residences', unitNumber: 'A1', rentAmount: 85000, status: 'Vacant' },
  { id: 'unit-9-b2', propertyId: 'prop-9', propertyName: 'Lavington Green Residences', unitNumber: 'B2', rentAmount: 135000, status: 'Occupied', tenantName: 'Daniel Otieno' },

  { id: 'unit-10-house1', propertyId: 'prop-10', propertyName: 'Karen Manor Homes', unitNumber: 'House 1', rentAmount: 160000, status: 'Vacant' },
  { id: 'unit-10-house2', propertyId: 'prop-10', propertyName: 'Karen Manor Homes', unitNumber: 'House 2', rentAmount: 210000, status: 'Vacant' },

  { id: 'unit-11-a04', propertyId: 'prop-11', propertyName: 'South B Sunrise Apartments', unitNumber: 'A-04', rentAmount: 18000, status: 'Vacant' },
  { id: 'unit-11-b12', propertyId: 'prop-11', propertyName: 'South B Sunrise Apartments', unitNumber: 'B-12', rentAmount: 32000, status: 'Occupied', tenantName: 'Peter Mwangi' },
  { id: 'unit-11-c07', propertyId: 'prop-11', propertyName: 'South B Sunrise Apartments', unitNumber: 'C-07', rentAmount: 45000, status: 'Vacant' },

  { id: 'unit-12-102', propertyId: 'prop-12', propertyName: 'Ruaka Riverside Apartments', unitNumber: '102', rentAmount: 22000, status: 'Vacant' },
  { id: 'unit-12-205', propertyId: 'prop-12', propertyName: 'Ruaka Riverside Apartments', unitNumber: '205', rentAmount: 32000, status: 'Vacant' },
  { id: 'unit-12-310', propertyId: 'prop-12', propertyName: 'Ruaka Riverside Apartments', unitNumber: '310', rentAmount: 38000, status: 'Occupied', tenantName: 'Faith Achieng' },

  { id: 'unit-13-b01', propertyId: 'prop-13', propertyName: 'Kitengela Meadows', unitNumber: 'B-01', rentAmount: 9000, status: 'Vacant' },
  { id: 'unit-13-b02', propertyId: 'prop-13', propertyName: 'Kitengela Meadows', unitNumber: 'B-02', rentAmount: 15000, status: 'Vacant' },

  { id: 'unit-14-r10', propertyId: 'prop-14', propertyName: 'Ongata Rongai Heights', unitNumber: 'R-10', rentAmount: 11000, status: 'Vacant' },
  { id: 'unit-14-r22', propertyId: 'prop-14', propertyName: 'Ongata Rongai Heights', unitNumber: 'R-22', rentAmount: 19000, status: 'Occupied', tenantName: 'Kevin Kiprop' },

  { id: 'unit-15-t3', propertyId: 'prop-15', propertyName: 'Thika Road Business Suites', unitNumber: 'T-3', rentAmount: 8000, status: 'Vacant' },
  { id: 'unit-15-t9', propertyId: 'prop-15', propertyName: 'Thika Road Business Suites', unitNumber: 'T-9', rentAmount: 14000, status: 'Vacant' },

  { id: 'unit-16-cot2', propertyId: 'prop-16', propertyName: 'Bamburi Beach Cottages', unitNumber: 'Cottage 2', rentAmount: 26000, status: 'Vacant' },
  { id: 'unit-16-cot5', propertyId: 'prop-16', propertyName: 'Bamburi Beach Cottages', unitNumber: 'Cottage 5', rentAmount: 38000, status: 'Occupied', tenantName: 'Amina Hassan' },

  { id: 'unit-17-villa1', propertyId: 'prop-17', propertyName: 'Diani Palm Villas', unitNumber: 'Villa 1', rentAmount: 45000, status: 'Vacant' },
  { id: 'unit-17-villa3', propertyId: 'prop-17', propertyName: 'Diani Palm Villas', unitNumber: 'Villa 3', rentAmount: 72000, status: 'Vacant' },

  { id: 'unit-18-m14', propertyId: 'prop-18', propertyName: 'Kisumu Milimani Residences', unitNumber: 'M-14', rentAmount: 20000, status: 'Vacant' },
  { id: 'unit-18-m21', propertyId: 'prop-18', propertyName: 'Kisumu Milimani Residences', unitNumber: 'M-21', rentAmount: 34000, status: 'Occupied', tenantName: 'Brian Onyango' },

  { id: 'unit-19-n05', propertyId: 'prop-19', propertyName: 'Nakuru Milimani Apartments', unitNumber: 'N-05', rentAmount: 14000, status: 'Vacant' },
  { id: 'unit-19-n18', propertyId: 'prop-19', propertyName: 'Nakuru Milimani Apartments', unitNumber: 'N-18', rentAmount: 24000, status: 'Vacant' },

  { id: 'unit-20-e07', propertyId: 'prop-20', propertyName: 'Eldoret Elgon View Apartments', unitNumber: 'E-07', rentAmount: 12000, status: 'Vacant' },
  { id: 'unit-20-e15', propertyId: 'prop-20', propertyName: 'Eldoret Elgon View Apartments', unitNumber: 'E-15', rentAmount: 20000, status: 'Occupied', tenantName: 'Ruth Chebet' },

  { id: 'unit-21-cot1', propertyId: 'prop-21', propertyName: 'Naivasha Lake View Cottages', unitNumber: 'Cottage 1', rentAmount: 15000, status: 'Vacant' },
  { id: 'unit-21-cot4', propertyId: 'prop-21', propertyName: 'Naivasha Lake View Cottages', unitNumber: 'Cottage 4', rentAmount: 22000, status: 'Vacant' }
];

const SEED_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    tenantName: 'Jane Doe',
    unitNumber: 'Unit 1',
    propertyName: 'Harbor View Villas',
    date: 'Oct 12, 2023',
    amount: 185000.00,
    status: 'Paid',
    paymentMethod: 'M-Pesa',
    code: 'MPESA-OCT-JD88'
  },
  {
    id: 'pay-2',
    tenantName: 'Mark Smith',
    unitNumber: 'Unit 2',
    propertyName: 'Harbor View Villas',
    date: 'Oct 11, 2023',
    amount: 240000.00,
    status: 'Paid',
    paymentMethod: 'Card',
    code: 'CARD-OCT-MS22'
  },
  {
    id: 'pay-3',
    tenantName: 'Lucia Rivera',
    unitNumber: 'Unit 3',
    propertyName: 'Harbor View Villas',
    date: 'Oct 10, 2023',
    amount: 160000.00,
    status: 'Pending',
    paymentMethod: 'M-Pesa',
    code: 'MPESA-OCT-LR33'
  },
  {
    id: 'pay-4',
    tenantName: 'Tom Brown',
    unitNumber: 'Suite A',
    propertyName: 'The Landmark Plaza',
    date: 'Oct 09, 2023',
    amount: 125000.00,
    status: 'Paid',
    paymentMethod: 'Card',
    code: 'CARD-OCT-TB05'
  }
];

const SEED_MAINTENANCE_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'req-1',
    title: 'Leaking Kitchen Sink',
    category: 'Plumbing',
    urgency: 'High',
    description: 'Water dripping from the main faucet gasket inside of the wood drawer under the sink.',
    status: 'In Progress',
    date: '2026-05-25',
    photos: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAMUjzaEq6ab_V_3MYMo4C6cZFsDjDbKIg_8Pat8Qld5o4TaYVhsmYYTTv0OmwgZ-4I8RGO3LgwQbmryvRw-JuQxSzRcimztLBcV-zJz6kl0MtiWfMS4IkNGZvo3yRxoALnLPBHHAsj8PmXMuQdx4lExUq6yqEyHjSqyVCrfKAqh3sKlD3ZhkMaYXItTe2XwFYBEknIP8pYnQgskVaBzn34fRnBlH2KL3P1Tph3-VjQ8taeHBuXdcS1q2xubjz3yb7Z-H2_bLb0ODzo'
    ],
    technicianName: 'Mark S.',
    technicianEmail: 'mark@renziy.app',
    technicianPhone: '0743991122',
    technicianAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
    arrivalTime: '2:00 PM',
    propertyName: 'Oakwood Heights',
    unitNumber: 'Apt 4B',
    tenantName: 'Alex Smith'
  },
  {
    id: 'req-2',
    title: 'Filter Replacement',
    category: 'HVAC',
    urgency: 'Low',
    description: 'Routine filter change requested for the central HVAC in the hallway.',
    status: 'Submitted',
    date: '2026-05-26',
    photos: [],
    propertyName: 'Oakwood Heights',
    unitNumber: 'Apt 4B',
    tenantName: 'Alex Smith'
  },
  {
    id: 'req-3',
    title: 'Hallway Light Flickering',
    category: 'Electrical',
    urgency: 'Med',
    description: 'The overhead lights near the entrance are flickering on and off intermittently.',
    status: 'Acknowledged',
    date: '2026-05-24',
    photos: [],
    propertyName: 'Oakwood Heights',
    unitNumber: 'Apt 201',
    tenantName: 'Sarah Jenkins'
  }
];

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-lockout-alert',
    title: 'Critical Door Lockout Warning',
    message: 'Your rent payment of KES 145,000 is now overdue. Continued failure to settle this balance will result in your unit smart lock being engaged remotely.',
    date: 'Just now',
    type: 'payment',
    unread: true
  },
  {
    id: 'notif-1',
    title: 'Maintenance Update',
    message: 'A technician (Mark S.) has been assigned to your sink repair.',
    date: '2 hours ago',
    type: 'maintenance',
    unread: true
  },
  {
    id: 'notif-2',
    title: 'Lease Document',
    message: 'Your signed lease renewal is now available in your documents.',
    date: 'Yesterday',
    type: 'lease',
    unread: true
  }
];

const SEED_MEMBERS: PlatformMember[] = [
  {
    id: 'member-admin-owner',
    role: 'admin',
    name: 'Renziy Owner',
    phone: '0743475247',
    email: adminAccountEmail,
    password: adminAccountPassword,
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=480&q=80',
    specialty: 'Platform owner',
    joinDate: '2026-07-02',
    status: 'Active'
  },
  {
    id: 'member-landlord-default',
    role: 'landlord',
    name: 'John Doe',
    phone: '0743475247',
    email: 'john@renziy.app',
    password: seedAccountPassword,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRxmlZiyPxhMA9KhxxEY-ZornwU45XOarKthi5rZwjaUXVYAzK1Rptwz3XSUMih-aX7N40cr2Ki-5KZvD7pUHT8xTTKjuQMyyucNGma4FaFJirfRO8Nmxdo7wvHhgJnJDxwkPMa5NOJdwGCIEP9IoZoEnvk7HAYZ8jfseOFIDZ7L5DKDb2LTYFaZymzBJ-SYm2ragI8Q_dxp6yzf6AjtEmLdC6yZGqnU2ZCun5dcEqufGWVNNfnsQoC1JyHXHZfKXLK1rfwMLmEMPm',
    propertyName: 'Oakwood Heights',
    joinDate: '2026-05-20',
    status: 'Active'
  },
  {
    id: 'member-tenant-default',
    role: 'tenant',
    name: 'Alex Smith',
    phone: '0712456789',
    email: 'alex@renziy.app',
    password: seedAccountPassword,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB',
    propertyName: 'Oakwood Heights',
    unitNumber: 'Apt 4B',
    rentAmount: 145000,
    joinDate: '2026-05-22',
    status: 'Active'
  },
  {
    id: 'member-worker-default',
    role: 'worker',
    name: 'Mark S.',
    phone: '0743991122',
    email: 'mark@renziy.app',
    password: seedAccountPassword,
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgHGl0k6f2XkLYjCLHl8a48TXjgy-Id98ps78OnE0wYtLYeuNe_SA4yid2BdyFcW72NvvX3QTFMKW2S31QWeq59noa99dscfJozILMQreMZHQdsc0PHSXD0e5EIvb9TE7fmsbiuZuJjR6Lz4WECW4S19uS50wvYbdJbxdvgGDRylaTrJhQhFiwhN9nARa_9fL6xs8Z2tDwqsJYhESjTEQmF8aARejNImS_FH9kV5YbJu-Ve_Ikaz_vvgOX0gmzBZfj1AodlcycXiGb',
    specialty: 'Plumbing and general repairs',
    joinDate: '2026-05-23',
    status: 'Active'
  }
];

// rentalApplications has no seed data - the table just starts empty.

const DEFAULT_TENANT_BALANCE = 145000;

const DEFAULT_SETTLEMENT_CONFIG: SettlementConfig = {
  mpesaType: 'Paybill',
  mpesaDetails: '174379',
  mpesaAccountName: 'RENZIY APP MANAGEMENT',
  paybillAccount: 'RENT',
  bankName: 'Equity Bank',
  bankAccountName: 'Renziy Real Estate Ltd',
  bankAccountNumber: '1234567890123',
  bankRoutingCode: 'EQTYKE'
};

const sessionSecret = requireSecret("RENZIY_SESSION_SECRET");
const passwordPepper = requireSecret("RENZIY_PASSWORD_PEPPER");
const sessionTtlMs = 1000 * 60 * 60 * 8;
const MAX_TEXT_LENGTH = 500;

interface SessionPayload {
  email: string;
  role: PlatformMember['role'];
  exp: number;
}

type PublicMember = Omit<PlatformMember, "password" | "passwordHash">;
type PasswordResetChallenge = {
  memberId: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
};

// Replaces the old in-memory Map - it never survived a serverless cold start
// any better than the JSON file did, since it's the same kind of state.
// key is the PK, so a "set" is delete-then-insert rather than a real upsert -
// fine here since there's no concurrent-write risk for one user's own code.
const getPasswordResetChallenge = async (key: string): Promise<PasswordResetChallenge | null> => {
  const row = await selectOne<PasswordResetChallenge>("password_reset_challenges", [["key", "=", key]]);
  return row;
};
const setPasswordResetChallenge = async (key: string, value: PasswordResetChallenge) => {
  await deleteRows("password_reset_challenges", [["key", "=", key]]);
  await insertRow("password_reset_challenges", { key, ...value });
};
const deletePasswordResetChallenge = async (key: string) => {
  await deleteRows("password_reset_challenges", [["key", "=", key]]);
};

const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const sanitizeText = (value: unknown, max = MAX_TEXT_LENGTH) => (
  typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, max) : ""
);
const sanitizePhone = (value: unknown) => sanitizeText(value, 32).replace(/[^\d+()\-\s]/g, "");
const sanitizeUrl = (value: unknown) => {
  const text = sanitizeText(value, 1000);
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
};
const sanitizeAvatarUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text) return "";
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(text)) {
    return text.length <= 2_500_000 ? text : "";
  }
  return sanitizeUrl(text);
};

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.pbkdf2Sync(`${password}${passwordPepper}`, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
};

const maskEmail = (value: string) => {
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
};

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? `${digits.slice(0, 3)}****${digits.slice(-2)}` : value;
};

const resetKey = (role: PlatformMember['role'], email: string) => `${role}:${email.toLowerCase()}`;

const verifyPassword = (member: PlatformMember, password: unknown) => {
  if (typeof password !== "string" || password.length < 6) return false;
  if (!member.passwordHash && member.password) {
    const expected = Buffer.from(member.password);
    const actual = Buffer.from(password);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  if (!member.passwordHash) return false;
  const [algorithm, iterationsRaw, salt, expectedHash] = member.passwordHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !salt || !expectedHash) return false;
  const iterations = Number(iterationsRaw);
  const actualHash = crypto.pbkdf2Sync(`${password}${passwordPepper}`, salt, iterations, 32, "sha256").toString("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

const scrubMember = (member: PlatformMember): PublicMember => {
  const { password, passwordHash, ...publicMember } = member;
  return publicMember;
};

const scrubMembers = (list: PlatformMember[]) => list.map(scrubMember);

const signSession = (payload: SessionPayload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
};

const readSession = async (req: express.Request): Promise<SessionPayload | null> => {
  const auth = req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expectedSignature = crypto.createHmac("sha256", sessionSecret).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.email || !payload.role || payload.exp < Date.now()) return null;
    const activeMember = await selectOne("members", [
      ["status", "=", "Active"],
      ["role", "=", payload.role],
      ["email", "=", payload.email.toLowerCase()]
    ]);
    return activeMember ? payload : null;
  } catch {
    return null;
  }
};

const requireRole = async (req: express.Request, res: express.Response, roles: PlatformMember['role'][]) => {
  const session = await readSession(req);
  if (!session) {
    res.status(401).json({ error: "Signed-in session required" });
    return null;
  }
  if (!roles.includes(session.role)) {
    res.status(403).json({ error: "This account cannot perform that action" });
    return null;
  }
  return session;
};

const sanitizePropertyInput = (body: Record<string, unknown>) => {
  const fields: Partial<Property> = {};
  if (typeof body.name === "string") fields.name = sanitizeText(body.name, 120);
  if (typeof body.address === "string") fields.address = sanitizeText(body.address, 180);
  if (typeof body.imageUrl === "string") fields.imageUrl = sanitizeUrl(body.imageUrl);
  if (typeof body.county === "string") fields.county = sanitizeText(body.county, 80);
  if (typeof body.constituency === "string") fields.constituency = sanitizeText(body.constituency, 80);
  if (typeof body.town === "string") fields.town = sanitizeText(body.town, 80);
  if (typeof body.neighborhood === "string") fields.neighborhood = sanitizeText(body.neighborhood, 120);
  if (typeof body.specificLocation === "string") fields.specificLocation = sanitizeText(body.specificLocation, 160);
  if (typeof body.description === "string") fields.description = sanitizeText(body.description, 500);
  if (Array.isArray(body.amenities)) {
    fields.amenities = body.amenities
      .filter((item): item is string => typeof item === "string")
      .map(item => sanitizeText(item, 60))
      .slice(0, 20);
  }
  if (typeof body.contactPhone === "string") fields.contactPhone = sanitizePhone(body.contactPhone);
  if (typeof body.mapQuery === "string") fields.mapQuery = sanitizeText(body.mapQuery, 200);
  if (body.unitsCount !== undefined) fields.unitsCount = normalizeUnitCount(body.unitsCount);
  return fields;
};

const sanitizeMemberInput = (input: Partial<PlatformMember>) => {
  // Strip password/passwordHash before the ...rest spread below - otherwise
  // a caller-supplied plaintext password rides through untouched into
  // whatever gets inserted, since neither field is in the explicit allowlist
  // that follows. Every caller that legitimately needs a passwordHash sets
  // it explicitly afterward via hashPassword(); nothing should ever persist
  // req.body.password verbatim.
  const { password, passwordHash, ...rest } = input;
  return {
    ...rest,
    name: sanitizeText(input.name, 120),
    phone: sanitizePhone(input.phone),
    email: normalizeEmail(input.email),
    propertyName: sanitizeText(input.propertyName, 160) || undefined,
    unitNumber: sanitizeText(input.unitNumber, 80) || undefined,
    specialty: sanitizeText(input.specialty, 160) || undefined,
    avatarUrl: sanitizeAvatarUrl(input.avatarUrl) || undefined
  };
};

// Inserts seed/demo rows into Postgres, but only where a row with that id
// doesn't already exist (upsertIgnoreDuplicates is "insert if missing", not
// an overwrite) - so re-running this on every cold start never clobbers real
// data a user has since changed (e.g. a changed password hash).
const ensureSeedData = async () => {
  const seedMembers: PlatformMember[] = SEED_MEMBERS.map(member => {
    const { password, ...rest } = member;
    return password ? { ...rest, passwordHash: hashPassword(password) } : rest;
  });

  await Promise.all([
    upsertIgnoreDuplicates("properties", SEED_PROPERTIES, "id"),
    upsertIgnoreDuplicates("units", SEED_UNITS, "id"),
    upsertIgnoreDuplicates("payments", SEED_PAYMENTS, "id"),
    upsertIgnoreDuplicates("maintenance_requests", SEED_MAINTENANCE_REQUESTS, "id"),
    upsertIgnoreDuplicates("notifications", SEED_NOTIFICATIONS, "id"),
    upsertIgnoreDuplicates("members", seedMembers, "id"),
    upsertIgnoreDuplicates(
      "app_settings",
      [{ id: "singleton", tenantBalance: DEFAULT_TENANT_BALANCE, settlementConfig: DEFAULT_SETTLEMENT_CONFIG }],
      "id"
    )
  ]);
};

ensureSeedData().catch(err => {
  console.error("Failed to seed Renziy data in Postgres:", err);
});

const app = express();
const PORT = 3000;

// These only ever apply to this Express app's own responses - on Vercel,
// that's /api/* only. The static HTML/JS/CSS shell is rewritten straight to
// a static file (see vercel.json's rewrites) and never touches this
// middleware, so the same header values are duplicated in vercel.json's
// `headers` block for that path. Keep both in sync if either changes.
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; frame-src https://www.google.com https://maps.google.com; connect-src 'self' https://wa.me https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
  );
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
  }
  next();
});
app.use(express.json({ limit: "3mb" }));
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

const writeBuckets = new Map<string, { count: number; resetAt: number }>();
app.use("/api", (req, res, next) => {
  if (req.method === "GET") return next();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${ip}:${req.path}`;
  const now = Date.now();
  const bucket = writeBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    writeBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (bucket.count >= 60) {
    return res.status(429).json({ error: "Too many requests. Try again shortly." });
  }
  bucket.count += 1;
  next();
});

const USER_ROLES = ['admin', 'landlord', 'tenant', 'worker'] as const;
const SELF_REGISTRATION_ROLES = ['landlord', 'tenant', 'worker'] as const;
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Overdue'] as const;
const PAYMENT_METHODS = ['M-Pesa', 'Card'] as const;
const MAINTENANCE_STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'] as const;
const MAINTENANCE_URGENCY = ['Low', 'Med', 'High', 'Emergency'] as const;

const isOneOf = <T extends readonly string[]>(values: T, value: unknown): value is T[number] => (
  typeof value === 'string' && values.includes(value)
);

// Wraps an async route handler so a thrown error becomes a 500 response
// instead of an unhandled rejection - none of the original sync handlers
// needed this, since nothing they did could reject a promise.
const asyncHandler = (
  fn: (req: express.Request, res: express.Response) => Promise<unknown>
) => (req: express.Request, res: express.Response) => {
  fn(req, res).catch(err => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  });
};

const getActiveWorker = async (workerEmail: unknown) => {
  if (typeof workerEmail !== 'string') return undefined;
  const worker = await selectOne<PlatformMember>("members", [
    ["role", "=", "worker"],
    ["status", "=", "Active"],
    ["email", "=", normalizeEmail(workerEmail)]
  ]);
  return worker ?? undefined;
};

const propertyBelongsTo = async (propertyId: string, email: string) => {
  const property = await selectOne("properties", [["id", "=", propertyId], ["ownerEmail", "=", normalizeEmail(email)]]);
  return Boolean(property);
};

const unitBelongsTo = async (unitId: string, email: string) => {
  const unit = await selectOne<{ propertyId: string }>("units", [["id", "=", unitId]]);
  return Boolean(unit && await propertyBelongsTo(unit.propertyId, email));
};

// Any signed-in account may call endpoints guarded by this - use requireRole
// instead when only specific roles should be allowed.
const requireSession = (req: express.Request, res: express.Response) => requireRole(req, res, [...USER_ROLES]);

const findOwnMember = async (session: SessionPayload) => {
  const member = await selectOne<PlatformMember>("members", [["role", "=", session.role], ["email", "=", normalizeEmail(session.email)]]);
  return member ?? undefined;
};

const portfolioPropertyNames = async (email: string) => {
  const rows = await selectRows<{ name: string }>("properties", [["ownerEmail", "=", normalizeEmail(email)]]);
  return rows.map(row => row.name);
};

const getAppSettings = async (): Promise<{ tenantBalance: number; settlementConfig: SettlementConfig }> => {
  const settings = await selectOne<{ tenantBalance: number; settlementConfig: SettlementConfig }>("app_settings", [["id", "=", "singleton"]]);
  if (!settings) throw new Error("app_settings singleton row is missing - was db/schema.sql run and seeded?");
  return settings;
};

  // API Routes
  app.get("/api/health", asyncHandler(async (req, res) => {
    const [properties, units, payments, maintenanceRequests, members, rentalApplications] = await Promise.all([
      countRows("properties"),
      countRows("units"),
      countRows("payments"),
      countRows("maintenance_requests"),
      countRows("members"),
      countRows("rental_applications")
    ]);
    res.json({
      ok: true,
      service: 'Renziy API',
      counts: { properties, units, payments, maintenanceRequests, members, rentalApplications }
    });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const role = req.body.role;
    const email = normalizeEmail(req.body.email);
    if (!isOneOf(USER_ROLES, role) || !email || typeof req.body.password !== "string") {
      return res.status(400).json({ error: "Email, password, and account type are required" });
    }
    const member = await selectOne<PlatformMember>("members", [["role", "=", role], ["email", "=", email], ["status", "=", "Active"]]);
    if (!member || !verifyPassword(member, req.body.password)) {
      return res.status(401).json({ error: "Invalid email, password, or account type" });
    }
    if (member.password && !member.passwordHash) {
      const { password, ...rest } = member;
      const securedMember = { ...rest, password: null, passwordHash: hashPassword(password) };
      await updateOne("members", securedMember, [["id", "=", member.id]]);
    }
    const token = signSession({ email: member.email, role: member.role, exp: Date.now() + sessionTtlMs });
    res.json({ token, member: scrubMember(member) });
  }));

  app.post("/api/auth/request-password-reset", asyncHandler(async (req, res) => {
    const role = req.body.role;
    const email = normalizeEmail(req.body.email);
    if (!isOneOf(USER_ROLES, role) || !email) {
      return res.status(400).json({ error: "Role and email are required" });
    }

    const member = await selectOne<PlatformMember>("members", [["role", "=", role], ["email", "=", email], ["status", "=", "Active"]]);
    if (!member) {
      return res.status(404).json({ error: "No active account matches that role and email" });
    }

    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await setPasswordResetChallenge(resetKey(role, email), {
      memberId: member.id,
      codeHash: hashPassword(resetCode),
      expiresAt,
      attempts: 0
    });

    if (resend) {
      // The code must never be returned in the API response once it's
      // actually emailed - doing so would let anyone who knows an account's
      // email take it over instantly, defeating the point of sending it.
      const { error: sendError } = await resend.emails.send({
        from: resetEmailFrom,
        to: member.email,
        subject: "Your Renziy password reset code",
        html: `<p>Your Renziy password reset code is <strong>${resetCode}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`
      });
      if (sendError) throw sendError;
    } else {
      // Dev fallback when RESEND_API_KEY isn't configured locally.
      console.log(`[password-reset] code for ${member.email} (${role}): ${resetCode} - expires ${new Date(expiresAt).toISOString()}`);
    }

    res.json({
      success: true,
      delivery: {
        email: maskEmail(member.email),
        phone: maskPhone(member.phone),
        ...(resend ? {} : { resetCode }),
        expiresAt
      }
    });
  }));

  app.post("/api/auth/confirm-password-reset", asyncHandler(async (req, res) => {
    const role = req.body.role;
    const email = normalizeEmail(req.body.email);
    const code = sanitizeText(req.body.code, 12).replace(/\D/g, "");
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!isOneOf(USER_ROLES, role) || !email || !code || password.length < 6) {
      return res.status(400).json({ error: "Role, email, reset code, and a 6+ character password are required" });
    }

    const key = resetKey(role, email);
    const challenge = await getPasswordResetChallenge(key);
    if (!challenge || challenge.expiresAt < Date.now()) {
      await deletePasswordResetChallenge(key);
      return res.status(400).json({ error: "The reset code is invalid or expired" });
    }

    if (challenge.attempts >= 5 || !verifyPassword({ passwordHash: challenge.codeHash } as PlatformMember, code)) {
      await setPasswordResetChallenge(key, { ...challenge, attempts: challenge.attempts + 1 });
      return res.status(400).json({ error: "The reset code is invalid or expired" });
    }

    const member = await selectOne<PlatformMember>("members", [["id", "=", challenge.memberId], ["role", "=", role], ["email", "=", email]]);
    if (!member) {
      await deletePasswordResetChallenge(key);
      return res.status(404).json({ error: "Account not found" });
    }
    const securedMember: PlatformMember = {
      ...member,
      password: undefined,
      passwordHash: hashPassword(password)
    };
    await updateOne("members", { ...securedMember, password: null }, [["id", "=", member.id]]);
    await deletePasswordResetChallenge(key);
    res.json({ success: true, member: scrubMember(securedMember) });
  }));

  app.post("/api/auth/register", asyncHandler(async (req, res) => {
    const role = req.body.role;
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const input = sanitizeMemberInput(req.body);
    if (!isOneOf(SELF_REGISTRATION_ROLES, role) || !input.name || !input.phone || !input.email || password.length < 6) {
      return res.status(400).json({ error: "Name, phone, email, account type, and a 6+ character password are required" });
    }
    const existing = await selectOne("members", [["role", "=", role], ["email", "=", input.email.toLowerCase()]]);
    if (existing) {
      return res.status(409).json({ error: "This email already has that account type" });
    }
    const member: PlatformMember = {
      ...input,
      role,
      id: req.body.id || `member-${Date.now()}`,
      passwordHash: hashPassword(password),
      joinDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    } as PlatformMember;

    await insertRow("members", member);
    await insertRow("notifications", {
      id: `notif-member-${Date.now()}`,
      title: 'New Platform Member',
      message: `${member.name} joined Renziy as a ${member.role}.`,
      date: 'Just now',
      type: 'lease',
      unread: true
    });
    const token = signSession({ email: member.email, role: member.role, exp: Date.now() + sessionTtlMs });
    res.json({ token, member: scrubMember(member) });
  }));

  const SETTLEMENT_MPESA_TYPES = ['Paybill', 'BuyGoods', 'PhoneNumber'] as const;

  app.get("/api/settlement", asyncHandler(async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const { settlementConfig } = await getAppSettings();
    res.json(settlementConfig);
  }));

  app.post("/api/settlement", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const body = req.body as Partial<SettlementConfig>;
    const updates: Partial<SettlementConfig> = {};
    if (body.mpesaType !== undefined) {
      if (!isOneOf(SETTLEMENT_MPESA_TYPES, body.mpesaType)) {
        return res.status(400).json({ error: "Unsupported M-Pesa settlement type" });
      }
      updates.mpesaType = body.mpesaType;
    }
    if (body.mpesaDetails !== undefined) updates.mpesaDetails = sanitizeText(body.mpesaDetails, 120);
    if (body.mpesaAccountName !== undefined) updates.mpesaAccountName = sanitizeText(body.mpesaAccountName, 120);
    if (body.paybillAccount !== undefined) updates.paybillAccount = sanitizeText(body.paybillAccount, 120);
    if (body.bankName !== undefined) updates.bankName = sanitizeText(body.bankName, 120);
    if (body.bankAccountName !== undefined) updates.bankAccountName = sanitizeText(body.bankAccountName, 120);
    if (body.bankAccountNumber !== undefined) updates.bankAccountNumber = sanitizeText(body.bankAccountNumber, 40);
    if (body.bankRoutingCode !== undefined) updates.bankRoutingCode = sanitizeText(body.bankRoutingCode, 40);

    const current = await getAppSettings();
    const settlementConfig = { ...current.settlementConfig, ...updates };
    await updateRows("app_settings", { settlementConfig }, [["id", "=", "singleton"]]);
    res.json(settlementConfig);
  }));

  app.get("/api/properties", asyncHandler(async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const properties = await selectRows("properties");
    res.json(properties);
  }));

  // Public, unauthenticated - powers the "browse houses" preview on the
  // marketing landing page. Only marketplace-listed properties and their
  // vacant units, with ownerEmail stripped (no reason to expose landlord
  // emails to anonymous visitors just for browsing).
  app.get("/api/marketplace/listings", asyncHandler(async (req, res) => {
    const [properties, vacantUnits] = await Promise.all([
      selectRows<Property>("properties", [["availableForMarketplace", "=", true]]),
      selectRows<Unit>("units", [["status", "=", "Vacant"]])
    ]);
    const publicProperties = properties.map(({ ownerEmail, ...rest }) => rest);
    res.json({ properties: publicProperties, units: vacantUnits });
  }));

  app.post("/api/properties", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { name, address, unitsCount } = req.body;
    if (!name || !address || !unitsCount) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const sanitized = sanitizePropertyInput(req.body);
    const normalizedUnitsCount = normalizeUnitCount(unitsCount);

    const id = `prop-${Date.now()}`;
    const newProperty: Property = {
      ...sanitized,
      id,
      name: sanitizeText(name, 120),
      address: sanitizeText(address, 180),
      unitsCount: normalizedUnitsCount,
      availableForMarketplace: true,
      ownerEmail: session.email
    } as Property;

    // Auto generate internal units
    const generatedUnits: Unit[] = Array.from({ length: normalizedUnitsCount }).map((_, index) => {
      const unitNum = `${100 + index + 1}`;
      return {
        id: `unit-${id}-${unitNum}`,
        propertyId: id,
        propertyName: name,
        unitNumber: unitNum,
        rentAmount: 15000 + index * 1000,
        status: index % 3 === 0 ? 'Vacant' : 'Occupied',
        tenantName: index % 3 === 0 ? undefined : ['Marcus Holloway', 'Sarah Jenkins', 'Jane Doe'][index % 3]
      };
    });

    await insertRow("properties", newProperty);
    await insertRows("units", generatedUnits);

    res.json({ property: newProperty, addedUnits: generatedUnits });
  }));

  app.patch("/api/properties/:id", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { id } = req.params;
    const sanitized = sanitizePropertyInput(req.body);

    const existingProperty = await selectOne<Property>("properties", [["id", "=", id]]);
    if (!existingProperty || (session.role !== 'admin' && existingProperty.ownerEmail?.toLowerCase() !== session.email.toLowerCase())) {
      return res.status(404).json({ error: "Property not found" });
    }

    const updatedProperty = await updateOne<Property>("properties", { ...sanitized, availableForMarketplace: true }, [["id", "=", id]]);
    if (!updatedProperty) throw new Error("Property update failed to return a row");

    await updateRows("units", { propertyName: updatedProperty.name }, [["propertyId", "=", id]]);

    res.json(updatedProperty);
  }));

  app.get("/api/units", asyncHandler(async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const [allUnits, ownedProps] = await Promise.all([
      selectRows<Unit>("units"),
      session.role === 'landlord'
        ? selectRows<{ id: string }>("properties", [["ownerEmail", "=", normalizeEmail(session.email)]])
        : Promise.resolve([])
    ]);
    const ownedIds = new Set(ownedProps.map(p => p.id));
    const viewerMember = session.role === 'tenant' ? await findOwnMember(session) : undefined;
    const visibleUnits = allUnits.map(unit => {
      if (session.role === 'admin') return unit;
      if (session.role === 'landlord' && ownedIds.has(unit.propertyId)) return unit;
      const isOwnUnit = Boolean(viewerMember && (
        unit.tenantName === viewerMember.name ||
        (viewerMember.propertyName === unit.propertyName && viewerMember.unitNumber === unit.unitNumber)
      ));
      if (isOwnUnit) return unit;
      // Marketplace browsing needs vacancy/rent/property data platform-wide,
      // but strangers have no reason to see who lives in an occupied unit.
      const { tenantName, tenantAvatar, lockReason, ...publicUnit } = unit;
      return publicUnit;
    });
    res.json(visibleUnits);
  }));

  app.post("/api/units/assign", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { unitId, tenantName } = req.body;
    if (!unitId || !tenantName) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    if (session.role !== 'admin' && !await unitBelongsTo(unitId, session.email)) {
      return res.status(403).json({ error: "You can only update units in your portfolio" });
    }

    const updatedUnit = await updateOne<Unit>("units", {
      status: 'Occupied',
      tenantName,
      tenantAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB'
    }, [["id", "=", unitId]]);

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    res.json(updatedUnit);
  }));

  app.post("/api/units/update", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { unitId, tenantName, rentAmount, status } = req.body;
    if (!unitId) {
      return res.status(400).json({ error: "Missing unitId" });
    }
    if (session.role !== 'admin' && !await unitBelongsTo(unitId, session.email)) {
      return res.status(403).json({ error: "You can only update units in your portfolio" });
    }

    const existingUnit = await selectOne<Unit>("units", [["id", "=", unitId]]);
    if (!existingUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    const shouldUpdateTenant = Object.prototype.hasOwnProperty.call(req.body, "tenantName");
    const nextStatus = status !== undefined
      ? status
      : shouldUpdateTenant
        ? (tenantName ? 'Occupied' : 'Vacant')
        : existingUnit.status;
    const updatedUnit = await updateOne<Unit>("units", {
      rentAmount: rentAmount !== undefined ? Number(rentAmount) : existingUnit.rentAmount,
      status: nextStatus,
      tenantName: shouldUpdateTenant ? (tenantName || null) : nextStatus === 'Vacant' ? null : existingUnit.tenantName,
      tenantAvatar: shouldUpdateTenant
        ? (tenantName ? existingUnit.tenantAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOcbVtz4Nz5aTDAR2DZW9Pg9F6e65oPi6Td2jZ84CEwLXgn5HrvYocGZaVvLRdcS9eUaqLENJ27o2RqpElz14uBPV47JROuDd4JkbKG4lK3vapbE6KOkie8PQbaMTqlvURqdmEzyOUTLS-bssVrQp56st-qoqgO1NFNrdLvXPdL5SwnjZzSChp5a_s4toIffdm_8W02EPKg7MLqi3poWL6UDKib0nkwFBjpcLb7YMRsPtiVkMFt4jFzqbDf0SOuGuynYq7GjnWhyHB' : null)
        : nextStatus === 'Vacant' ? null : existingUnit.tenantAvatar
    }, [["id", "=", unitId]]);

    res.json(updatedUnit);
  }));

  app.post("/api/units/update-avatar", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant', 'landlord', 'admin']);
    if (!session) return;
    const { unitId, tenantAvatar } = req.body;
    if (!unitId || !tenantAvatar) {
      return res.status(400).json({ error: "Missing unitId or tenantAvatar" });
    }

    const updatedUnit = await updateOne<Unit>("units", { tenantAvatar }, [["id", "=", unitId]]);

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    res.json(updatedUnit);
  }));

  app.post("/api/units/lock", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { unitId, isLocked, lockReason } = req.body;
    if (!unitId) {
      return res.status(400).json({ error: "Missing unitId" });
    }
    if (session.role !== 'admin' && !await unitBelongsTo(unitId, session.email)) {
      return res.status(403).json({ error: "You can only lock units in your portfolio" });
    }

    const updatedUnit = await updateOne<Unit>("units", {
      isLocked: !!isLocked,
      lockReason: isLocked ? (lockReason || "Rent payment overdue") : null
    }, [["id", "=", unitId]]);

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit not found" });
    }

    // Trigger a notification to the tenant
    if (updatedUnit.tenantName) {
      await insertRow("notifications", {
        id: `notif-${Date.now()}`,
        title: isLocked ? 'Smart Lock Engaged' : 'Smart Lock Released',
        message: isLocked
          ? `Your unit ${updatedUnit.unitNumber} at ${updatedUnit.propertyName} has been locked by the landlord. Reason: ${updatedUnit.lockReason}. Settle your payments immediately to reactivate.`
          : `Your unit ${updatedUnit.unitNumber} at ${updatedUnit.propertyName} has been unlocked. Thank you for your payment.`,
        date: 'Just now',
        type: 'payment',
        unread: true
      });
    }

    res.json(updatedUnit);
  }));

  app.get("/api/payments", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['admin', 'landlord', 'tenant']);
    if (!session) return;
    if (session.role === 'admin') {
      return res.json(await selectRows("payments", [], { orderBy: "createdAt", desc: true }));
    }
    if (session.role === 'landlord') {
      const ownedNames = await portfolioPropertyNames(session.email);
      if (ownedNames.length === 0) return res.json([]);
      return res.json(await selectRows("payments", [["propertyName", "IN", ownedNames]], { orderBy: "createdAt", desc: true }));
    }
    const viewerMember = await findOwnMember(session);
    if (!viewerMember) return res.json([]);
    res.json(await selectRows("payments", [["tenantName", "=", viewerMember.name]], { orderBy: "createdAt", desc: true }));
  }));

  app.post("/api/payments", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant', 'landlord']);
    if (!session) return;
    const { tenantName, unitNumber, propertyName, date, amount, status, paymentMethod } = req.body;
    if (!tenantName || !amount || !paymentMethod) {
      return res.status(400).json({ error: "Missing required details" });
    }
    if (!isOneOf(PAYMENT_METHODS, paymentMethod)) {
      return res.status(400).json({ error: "Unsupported payment method" });
    }
    if (status && !isOneOf(PAYMENT_STATUSES, status)) {
      return res.status(400).json({ error: "Unsupported payment status" });
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "Payment amount must be greater than zero" });
    }

    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName,
      unitNumber: unitNumber || 'G-01',
      propertyName: propertyName || 'Portfolio Central',
      date: date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: numericAmount,
      status: status || 'Paid',
      paymentMethod,
      code: `${paymentMethod === 'M-Pesa' ? 'MPESA' : 'CARD'}-REC-${hash}`
    };

    await insertRow("payments", newPayment);

    const payingUnit = await selectOne<{ id: string }>("units", [["tenantName", "=", tenantName]]);
    if (payingUnit?.id === 'unit-1-4b' || tenantName === 'Alex Smith' || tenantName === 'Alex') {
      await updateRows("app_settings", { tenantBalance: 0 }, [["id", "=", "singleton"]]);
    }

    res.json(newPayment);
  }));

  app.get("/api/maintenance", asyncHandler(async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (session.role === 'admin') {
      return res.json(await selectRows("maintenance_requests", [], { orderBy: "createdAt", desc: true }));
    }
    if (session.role === 'landlord') {
      const ownedNames = await portfolioPropertyNames(session.email);
      if (ownedNames.length === 0) return res.json([]);
      return res.json(await selectRows("maintenance_requests", [["propertyName", "IN", ownedNames]], { orderBy: "createdAt", desc: true }));
    }
    if (session.role === 'worker') {
      const all = await selectRows<MaintenanceRequest>("maintenance_requests", [], { orderBy: "createdAt", desc: true });
      return res.json(all.filter(request => (
        request.technicianEmail?.toLowerCase() === session.email.toLowerCase() ||
        (!request.technicianEmail && request.status !== 'Resolved')
      )));
    }
    const viewerMember = await findOwnMember(session);
    if (!viewerMember) return res.json([]);
    res.json(await selectRows("maintenance_requests", [["tenantName", "=", viewerMember.name]], { orderBy: "createdAt", desc: true }));
  }));

  app.post("/api/maintenance", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant']);
    if (!session) return;
    const { title, category, urgency, description, photos, tenantName } = req.body;
    if (!title || !description || !urgency) {
      return res.status(400).json({ error: "Missing repair ticket content" });
    }
    if (!isOneOf(MAINTENANCE_URGENCY, urgency)) {
      return res.status(400).json({ error: "Unsupported repair urgency" });
    }

    const tenantMember = await selectOne<{ name: string }>("members", [["role", "=", "tenant"], ["email", "=", normalizeEmail(session.email)]]);
    const tName = tenantMember?.name || tenantName || 'Unassigned Tenant';
    const activeUnit = await selectOne<{ propertyName: string; unitNumber: string }>("units", [["tenantName", "=", tName]]);

    const newRequest: MaintenanceRequest = {
      id: `req-${Date.now()}`,
      title,
      category: category || 'Plumbing',
      urgency,
      description,
      status: 'Submitted',
      date: new Date().toISOString().split('T')[0],
      photos: photos || [],
      tenantName: tName,
      propertyName: activeUnit?.propertyName || 'Pending assignment',
      unitNumber: activeUnit?.unitNumber || 'Pending assignment'
    };

    await insertRow("maintenance_requests", newRequest);

    // Append notification log
    await insertRow("notifications", {
      id: `notif-${Date.now()}`,
      title: 'Request Received',
      message: `Your maintenance request "${title}" has been successfully logged.`,
      date: 'Just now',
      type: 'maintenance',
      unread: true
    });

    res.json(newRequest);
  }));

  app.patch("/api/maintenance/:id", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'worker', 'admin']);
    if (!session) return;
    const { id } = req.params;
    const { status, workerEmail } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    if (!isOneOf(MAINTENANCE_STATUSES, status)) {
      return res.status(400).json({ error: "Unsupported maintenance status" });
    }

    const existingRequest = await selectOne<MaintenanceRequest>("maintenance_requests", [["id", "=", id]]);

    let foundRequest: MaintenanceRequest | null = null;
    if (existingRequest) {
      const requestProperty = await selectOne<{ ownerEmail?: string }>("properties", [["name", "=", existingRequest.propertyName]]);
      const landlordOwnsRequest = requestProperty?.ownerEmail?.toLowerCase() === session.email.toLowerCase();
      const workerOwnsRequest = existingRequest.technicianEmail?.toLowerCase() === session.email.toLowerCase();
      if (!((session.role === 'landlord' && !landlordOwnsRequest) || (session.role === 'worker' && !workerOwnsRequest))) {
        const worker = await getActiveWorker(workerEmail);
        if (!(workerEmail && !worker)) {
          const techObj = worker ? {
            technicianName: worker.name,
            technicianEmail: worker.email,
            technicianPhone: worker.phone,
            technicianAvatar: worker.avatarUrl,
            arrivalTime: '3:30 PM'
          } : {};
          foundRequest = await updateOne<MaintenanceRequest>("maintenance_requests", { status, ...techObj }, [["id", "=", id]]);
        }
      }
    }

    if (!foundRequest) {
      return res.status(workerEmail ? 400 : 404).json({ error: workerEmail ? "Worker not found" : "Maintenance Request not found" });
    }

    await insertRow("notifications", {
      id: `notif-${Date.now()}`,
      title: 'Repair Status Updated',
      message: `Repair "${foundRequest.title}" for ${foundRequest.tenantName} is now marked as ${status}.`,
      date: 'Just now',
      type: 'maintenance',
      unread: true
    });

    res.json(foundRequest);
  }));

  app.post("/api/maintenance/:id/assign-worker", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'worker', 'admin']);
    if (!session) return;
    const { id } = req.params;
    const { workerEmail } = req.body;
    const worker = await getActiveWorker(workerEmail);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const existingRequest = await selectOne<MaintenanceRequest>("maintenance_requests", [["id", "=", id]]);

    let updatedRequest: MaintenanceRequest | null = null;
    if (existingRequest) {
      const requestProperty = await selectOne<{ ownerEmail?: string }>("properties", [["name", "=", existingRequest.propertyName]]);
      if (!(session.role === 'landlord' && requestProperty?.ownerEmail?.toLowerCase() !== session.email.toLowerCase())) {
        updatedRequest = await updateOne<MaintenanceRequest>("maintenance_requests", {
          status: existingRequest.status === 'Submitted' ? 'Acknowledged' : existingRequest.status,
          technicianName: worker.name,
          technicianEmail: worker.email,
          technicianPhone: worker.phone,
          technicianAvatar: worker.avatarUrl,
          arrivalTime: '3:30 PM'
        }, [["id", "=", id]]);
      }
    }

    if (!updatedRequest) {
      return res.status(404).json({ error: "Maintenance Request not found" });
    }

    await insertRow("notifications", {
      id: `notif-worker-${Date.now()}`,
      title: 'Worker Assigned',
      message: `${worker.name} has been contacted for "${updatedRequest.title}" at ${updatedRequest.propertyName} (${updatedRequest.unitNumber}).`,
      date: 'Just now',
      type: 'maintenance',
      unread: true
    });

    res.json(updatedRequest);
  }));

  app.get("/api/notifications", asyncHandler(async (req, res) => {
    // NOTE: notifications aren't tagged with a recipient in the data model yet,
    // so this can only gate on "is signed in", not filter to the caller's own
    // notifications. Every signed-in user currently sees the same feed.
    // Scoping this properly needs a recipientEmail/audience field added when
    // each notification is created - tracked as follow-up work.
    const session = await requireSession(req, res);
    if (!session) return;
    res.json(await selectRows("notifications", [], { orderBy: "createdAt", desc: true }));
  }));

  app.post("/api/notifications/read", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant', 'landlord', 'worker', 'admin']);
    if (!session) return;
    await updateRows("notifications", { unread: false }, [["id", "!=", ""]]);
    res.json({ success: true });
  }));

  app.get("/api/members", asyncHandler(async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    if (session.role === 'admin') {
      return res.json(scrubMembers(await selectRows<PlatformMember>("members")));
    }
    if (session.role === 'landlord') {
      const [allMembers, ownedNames] = await Promise.all([
        selectRows<PlatformMember>("members"),
        portfolioPropertyNames(session.email)
      ]);
      const visible = allMembers.filter(member => {
        if (member.role === 'admin') return false;
        if (member.role === 'landlord') return member.email.toLowerCase() === session.email.toLowerCase();
        return member.role === 'worker' || !member.propertyName || ownedNames.includes(member.propertyName);
      });
      return res.json(scrubMembers(visible));
    }
    // Tenants and workers only need their own record plus the worker
    // directory (technician contact info is not sensitive the way tenant
    // payment/PII data is, and landlords/tenants both need it).
    const allMembers = await selectRows<PlatformMember>("members");
    const visible = allMembers.filter(member => (
      member.role === 'worker' || member.email.toLowerCase() === session.email.toLowerCase()
    ));
    res.json(scrubMembers(visible));
  }));

  app.post("/api/members/avatar", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant', 'landlord', 'worker', 'admin']);
    if (!session) return;

    const memberId = sanitizeText(req.body.memberId, 80);
    const avatarUrl = sanitizeAvatarUrl(req.body.avatarUrl);
    const unitId = sanitizeText(req.body.unitId, 80);
    if (!memberId || !avatarUrl) {
      return res.status(400).json({ error: "Missing memberId or avatarUrl" });
    }

    const member = await selectOne<PlatformMember>("members", [["id", "=", memberId]]);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }
    if (member.email.toLowerCase() !== session.email.toLowerCase() || member.role !== session.role) {
      return res.status(403).json({ error: "You can only update your own profile picture" });
    }

    const updatedMember = await updateOne<PlatformMember>("members", { avatarUrl }, [["id", "=", memberId]]);
    if (!updatedMember) throw new Error("Member update failed to return a row");

    let updatedUnit: Unit | null = null;
    if (updatedMember.role === 'tenant') {
      const units = await selectRows<Unit>("units");
      const matchingUnit = units.find(unit => (
        (unitId && unit.id === unitId) ||
        unit.tenantName === updatedMember.name ||
        (updatedMember.propertyName === unit.propertyName && updatedMember.unitNumber === unit.unitNumber)
      ));
      if (matchingUnit) {
        updatedUnit = await updateOne<Unit>("units", { tenantAvatar: avatarUrl }, [["id", "=", matchingUnit.id]]);
      }
    }

    let updatedMaintenanceRequests: MaintenanceRequest[] | undefined;
    if (updatedMember.role === 'worker') {
      updatedMaintenanceRequests = await updateRows<MaintenanceRequest>(
        "maintenance_requests",
        { technicianAvatar: avatarUrl },
        [["technicianEmail", "=", updatedMember.email]]
      );
    }

    res.json({
      member: scrubMember(updatedMember),
      unit: updatedUnit,
      maintenanceRequests: updatedMaintenanceRequests
    });
  }));

  app.post("/api/members", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { role, name, phone, email } = req.body;
    if (!role || !name || !phone || !email) {
      return res.status(400).json({ error: "Missing required member fields" });
    }
    if (!isOneOf(USER_ROLES, role)) {
      return res.status(400).json({ error: "Unsupported member role" });
    }
    if (role === 'admin' && session.role !== 'admin') {
      return res.status(403).json({ error: "Only the app owner can create admin accounts" });
    }

    const sanitized = sanitizeMemberInput(req.body);
    const member: PlatformMember = {
      ...sanitized,
      role,
      id: req.body.id || `member-${Date.now()}`,
      joinDate: req.body.joinDate || new Date().toISOString().split('T')[0],
      status: req.body.status || 'Active'
    };

    await deleteRows("members", [["email", "=", member.email], ["role", "=", member.role]]);
    await insertRow("members", member);
    if (member.role === 'tenant' && member.propertyName && member.unitNumber) {
      await updateRows("units", {
        status: 'Occupied',
        tenantName: member.name,
        ...(member.avatarUrl ? { tenantAvatar: member.avatarUrl } : {})
      }, [["propertyName", "=", member.propertyName], ["unitNumber", "=", member.unitNumber]]);
    }
    await insertRow("notifications", {
      id: `notif-member-${Date.now()}`,
      title: 'New Platform Member',
      message: `${member.name} joined Renziy as a ${member.role}.`,
      date: 'Just now',
      type: 'lease',
      unread: true
    });

    res.json(scrubMember(member));
  }));

  app.get("/api/rental-applications", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['admin', 'landlord', 'tenant']);
    if (!session) return;
    if (session.role === 'admin') {
      return res.json(await selectRows("rental_applications"));
    }
    if (session.role === 'landlord') {
      const [ownedProps, ownedNames, allApplications] = await Promise.all([
        selectRows<{ id: string }>("properties", [["ownerEmail", "=", normalizeEmail(session.email)]]),
        portfolioPropertyNames(session.email),
        selectRows<RentalApplication>("rental_applications")
      ]);
      const ownedIds = ownedProps.map(p => p.id);
      return res.json(allApplications.filter(item => (
        ownedIds.includes(item.propertyId) ||
        ownedNames.includes(item.propertyName) ||
        item.ownerEmail?.toLowerCase() === session.email.toLowerCase()
      )));
    }
    res.json(await selectRows("rental_applications", [["tenantEmail", "=", session.email.toLowerCase()]]));
  }));

  app.post("/api/rental-applications", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant']);
    if (!session) return;
    const { propertyId, propertyName, unitId, unitNumber, rentAmount, tenantName, tenantEmail } = req.body;
    if (!propertyId || !propertyName || !unitId || !unitNumber || !rentAmount || !tenantName || !tenantEmail) {
      return res.status(400).json({ error: "Missing rental request details" });
    }
    const requestedUnit = await selectOne<Unit>("units", [["id", "=", unitId], ["propertyId", "=", propertyId]]);
    if (!requestedUnit) {
      return res.status(404).json({ error: "Requested unit not found" });
    }
    if (requestedUnit.status !== 'Vacant') {
      return res.status(409).json({ error: "Requested unit is no longer vacant" });
    }
    if (Number(rentAmount) !== requestedUnit.rentAmount) {
      return res.status(400).json({ error: "Rental request amount does not match unit rent" });
    }
    const activeRequests = await selectRows("rental_applications", [
      ["unitId", "=", unitId],
      ["tenantEmail", "=", tenantEmail],
      ["status", "!=", "Declined"]
    ]);
    if (activeRequests.length > 0) {
      return res.status(409).json({ error: "Tenant already has an active request for this unit" });
    }

    const application: RentalApplication = {
      ...req.body,
      id: req.body.id || `rent-app-${Date.now()}`,
      requestedAt: req.body.requestedAt || new Date().toISOString(),
      status: req.body.status || 'Awaiting Rent'
    };

    await deleteRows("rental_applications", [
      ["unitId", "=", application.unitId],
      ["tenantEmail", "=", application.tenantEmail],
      ["status", "!=", "Declined"]
    ]);
    await insertRow("rental_applications", application);

    await insertRow("notifications", {
      id: `notif-rental-${Date.now()}`,
      title: 'New House Request',
      message: `${application.tenantName} requested ${application.propertyName} - Unit ${application.unitNumber}.`,
      date: 'Just now',
      type: 'lease',
      unread: true
    });

    res.json(application);
  }));

  app.post("/api/rental-applications/:id/pay", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant']);
    if (!session) return;
    const { id } = req.params;
    const { method, paymentCode } = req.body;
    if (method && !isOneOf(PAYMENT_METHODS, method)) {
      return res.status(400).json({ error: "Unsupported payment method" });
    }

    const existing = await selectOne<RentalApplication>("rental_applications", [["id", "=", id]]);

    let application: RentalApplication | undefined = existing ?? undefined;
    if (existing && existing.status === 'Awaiting Rent') {
      const updated = await updateOne<RentalApplication>("rental_applications", {
        status: 'Rent Paid',
        paymentCode: paymentCode || `${method === 'Card' ? 'CARD' : 'MPESA'}-HOLD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      }, [["id", "=", id]]);
      application = updated ?? undefined;
    }

    if (!application) {
      return res.status(404).json({ error: "Rental request not found" });
    }
    if (application.status !== 'Rent Paid') {
      return res.status(409).json({ error: "Rental request is not awaiting rent" });
    }

    const paidApplication = application as RentalApplication;
    await insertRow("payments", {
      id: `pay-${Date.now()}`,
      tenantName: paidApplication.tenantName,
      unitNumber: paidApplication.unitNumber,
      propertyName: paidApplication.propertyName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: paidApplication.rentAmount,
      status: 'Paid',
      paymentMethod: method || 'M-Pesa',
      code: paidApplication.paymentCode || 'MPESA-HOLD'
    });

    await insertRow("notifications", {
      id: `notif-rental-paid-${Date.now()}`,
      title: 'House Request Rent Paid',
      message: `${paidApplication.tenantName} paid KES ${paidApplication.rentAmount.toLocaleString()} for ${paidApplication.propertyName} - Unit ${paidApplication.unitNumber}.`,
      date: 'Just now',
      type: 'payment',
      unread: true
    });

    res.json(paidApplication);
  }));

  app.post("/api/rental-applications/:id/approve", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { id } = req.params;

    const existing = await selectOne<RentalApplication>("rental_applications", [["id", "=", id]]);

    let application: RentalApplication | undefined = existing ?? undefined;
    if (existing && existing.status === 'Rent Paid' && (session.role === 'admin' || existing.ownerEmail?.toLowerCase() === session.email.toLowerCase())) {
      const requestedUnit = await selectOne<{ status: string }>("units", [["id", "=", existing.unitId]]);
      if (requestedUnit && requestedUnit.status === 'Vacant') {
        const updated = await updateOne<RentalApplication>("rental_applications", {
          status: 'Approved',
          approvedAt: new Date().toISOString()
        }, [["id", "=", id]]);
        application = updated ?? undefined;
      }
    }

    if (!application) {
      return res.status(404).json({ error: "Paid rental request not found" });
    }
    if (application.status !== 'Approved') {
      return res.status(409).json({ error: "Requested unit is no longer available for approval" });
    }

    const approvedApplication = application as RentalApplication;
    await updateRows("units", { status: 'Occupied', tenantName: approvedApplication.tenantName }, [["id", "=", approvedApplication.unitId]]);
    await updateRows("members", {
      propertyName: approvedApplication.propertyName,
      unitNumber: approvedApplication.unitNumber,
      rentAmount: approvedApplication.rentAmount
    }, [["email", "=", approvedApplication.tenantEmail], ["role", "=", "tenant"]]);

    await insertRow("notifications", {
      id: `notif-rental-approved-${Date.now()}`,
      title: 'Unit Approved',
      message: `${approvedApplication.propertyName} - Unit ${approvedApplication.unitNumber} has been approved for ${approvedApplication.tenantName}.`,
      date: 'Just now',
      type: 'lease',
      unread: true
    });

    res.json(approvedApplication);
  }));

  app.post("/api/rental-applications/:id/decline", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['landlord', 'admin']);
    if (!session) return;
    const { id } = req.params;

    const existing = await selectOne<RentalApplication>("rental_applications", [["id", "=", id]]);

    let application: RentalApplication | undefined;
    if (existing && (session.role === 'admin' || existing.ownerEmail?.toLowerCase() === session.email.toLowerCase())) {
      const updated = await updateOne<RentalApplication>("rental_applications", { status: 'Declined' }, [["id", "=", id]]);
      application = updated ?? undefined;
    }

    if (!application) {
      return res.status(404).json({ error: "Rental request not found" });
    }

    res.json(application);
  }));

  app.get("/api/balance", asyncHandler(async (req, res) => {
    // NOTE: tenantBalance is a single platform-wide value, not per-tenant -
    // a pre-existing data model gap, not something scoping reads can fix on
    // its own. Tracked as follow-up work alongside real payment integration.
    const session = await requireSession(req, res);
    if (!session) return;
    const { tenantBalance } = await getAppSettings();
    res.json({ tenantBalance });
  }));

  app.post("/api/balance/pay", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant']);
    if (!session) return;
    const { method, tenantName } = req.body;
    if (!method) {
      return res.status(400).json({ error: "Missing payment method details" });
    }
    if (!isOneOf(PAYMENT_METHODS, method)) {
      return res.status(400).json({ error: "Unsupported payment method" });
    }

    const { tenantBalance: originalAmount } = await getAppSettings();
    await updateRows("app_settings", { tenantBalance: 0 }, [["id", "=", "singleton"]]);

    const payingTenantName = tenantName || 'Alex Smith';
    let activeUnit = await selectOne<Unit>("units", [["tenantName", "=", payingTenantName]]);
    if (!activeUnit) {
      activeUnit = await selectOne<Unit>("units", [["id", "=", "unit-1-4b"]]);
    }

    // Auto-release smart lock for the paying tenant upon rent settlement.
    if (activeUnit) {
      await updateRows("units", { isLocked: false, lockReason: null }, [["id", "=", activeUnit.id]]);
    }

    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName: payingTenantName,
      unitNumber: activeUnit?.unitNumber || 'Pending assignment',
      propertyName: activeUnit?.propertyName || 'Pending assignment',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: originalAmount,
      status: 'Paid',
      paymentMethod: method,
      code: `${method === 'M-Pesa' ? 'FLW-MP' : 'FLW-RE'}-${hash}`
    };

    await insertRow("payments", newPayment);

    await insertRow("notifications", {
      id: `notif-${Date.now()}`,
      title: 'Rent Paid Successfully',
      message: `Successfully processed ${method} rent payment of KES ${originalAmount.toLocaleString()}.`,
      date: 'Just now',
      type: 'payment',
      unread: true
    });

    res.json({ success: true, payment: newPayment, originalAmount });
  }));

  // Vite development vs production static routing integration
  async function bootstrap() {
    if (!process.env.VERCEL) {
      if (process.env.NODE_ENV !== "production") {
        const [{ default: react }, { default: tailwindcss }] = await Promise.all([
          import("@vitejs/plugin-react"),
          import("@tailwindcss/vite"),
        ]);
        const vite = await createViteServer({
          configFile: false,
          plugins: [react(), tailwindcss()],
          resolve: {
            alias: {
              '@': path.resolve(process.cwd(), '.'),
            },
          },
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        // Support wildcard SPA routing
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Renziy Server active and running on http://0.0.0.0:${PORT}`);
      });
    }
  }

  bootstrap().catch((err) => {
    console.error("Failed to start Renziy server:", err);
  });

export default app;
