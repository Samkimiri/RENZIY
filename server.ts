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

// Real upsert (insert, or overwrite every column but the conflict key if the
// row already exists) - used for per-owner rows like settlement_configs
// where a later save should replace the earlier one, unlike the
// insert-if-missing semantics of upsertIgnoreDuplicates above.
const upsertRow = async <T = any>(table: string, row: object, conflictColumn: string): Promise<T> => {
  const record = row as Record<string, unknown>;
  const columns = Object.keys(record);
  const columnList = columns.map(c => `"${c}"`).join(", ");
  const values = columns.map(c => toSqlParam(record[c]));
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
  const updateSet = columns.filter(c => c !== conflictColumn).map(c => `"${c}" = EXCLUDED."${c}"`).join(", ");
  const { rows } = await sql.query(
    `INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT ("${conflictColumn}") DO UPDATE SET ${updateSet} RETURNING *`,
    values
  );
  return rows[0] as T;
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
  // Outstanding rent balance for this specific unit's tenant. Replaces the
  // old app_settings.tenantBalance singleton, which was one shared number
  // for the entire platform - see the units_balance migration below.
  balance?: number;
  // First of the calendar month this unit's balance was last topped up for
  // by runMonthlyBilling(). Null until the first billing pass touches it.
  lastBilledDate?: string | null;
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
  recipientEmail?: string;
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

// Bootstrap data - only the platform owner (admin) account is seeded
// automatically on a fresh database. Everything else (properties, units,
// tenants, landlords, workers, payments, maintenance requests) starts empty;
// real accounts and data come from people actually signing up and using the
// app, not from demo/sample records.
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
  }
];

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

// The Postgres driver hands back `date` columns as JS Date objects anchored
// to local midnight, not UTC - calling .toISOString() on one directly shifts
// the calendar day whenever the server's local timezone isn't UTC. Read the
// local Y/M/D straight off the Date instead of round-tripping through UTC.
const toDateOnlyString = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).split("T")[0];
};
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

// Additive, idempotent schema migration for deployments created before the
// per-unit balance / per-landlord settlement columns existed. Both
// statements are safe to run on every boot (IF NOT EXISTS). The one-time
// backfill only runs the first time the "balance" column is actually added
// in this process, moving the old shared app_settings.tenantBalance value
// onto the single demo unit that used to receive it, so nobody's demo
// balance silently disappears when the column is introduced.
const migrateSchema = async () => {
  const { rows: existingColumn } = await sql.query(
    `select 1 from information_schema.columns where table_name = 'units' and column_name = 'balance'`
  );
  const hadBalanceColumn = existingColumn.length > 0;

  await sql.query(`alter table units add column if not exists "balance" double precision not null default 0`);
  await sql.query(`
    create table if not exists settlement_configs (
      "ownerEmail" text primary key,
      "settlementConfig" jsonb not null default '{}'::jsonb
    )
  `);
  // Notifications had no recipient at all - every signed-in user saw the
  // exact same platform-wide feed. Old, recipient-less rows are cleared out
  // rather than kept unreadable-but-orphaned, since nobody could correctly
  // own them retroactively.
  const { rows: existingRecipientColumn } = await sql.query(
    `select 1 from information_schema.columns where table_name = 'notifications' and column_name = 'recipientEmail'`
  );
  const isFirstBootOfThisRelease = existingRecipientColumn.length === 0;
  if (isFirstBootOfThisRelease) {
    await sql.query(`alter table notifications add column if not exists "recipientEmail" text`);
    await sql.query(`delete from notifications where "recipientEmail" is null`);
  }

  if (!hadBalanceColumn) {
    const settings = await selectOne<{ tenantBalance: number }>("app_settings", [["id", "=", "singleton"]]);
    if (settings && settings.tenantBalance > 0) {
      await updateRows("units", { balance: settings.tenantBalance }, [["id", "=", "unit-1-4b"]]);
    }
  }

  // Recurring monthly rent billing - see runMonthlyBilling() below.
  await sql.query(`alter table units add column if not exists "lastBilledDate" date`);

  // One-time removal of the old hardcoded demo accounts (john/alex/mark and
  // their sample properties/units/payments/maintenance tickets). Gated to
  // the same first-boot signal as the notification migration above so it
  // never runs again after this release - otherwise a real future landlord
  // legitimately choosing john@renziy.app would get deleted on every
  // subsequent restart.
  if (isFirstBootOfThisRelease) {
    const demoPropertyIds = Array.from({ length: 21 }, (_, i) => `prop-${i + 1}`);
    await deleteRows("units", [["propertyId", "IN", demoPropertyIds]]);
    await deleteRows("properties", [["id", "IN", demoPropertyIds]]);
    await deleteRows("payments", [["id", "IN", ["pay-1", "pay-2", "pay-3", "pay-4"]]]);
    await deleteRows("maintenance_requests", [["id", "IN", ["req-1", "req-2", "req-3"]]]);
    await deleteRows("members", [["email", "IN", ["john@renziy.app", "alex@renziy.app", "mark@renziy.app"]]]);
  }

  // One-time removal of throwaway @example.com / .local test accounts left
  // over from developing and auditing this app. This must NOT run on every
  // boot: Vercel's serverless functions cold-start on nearly every request
  // under low traffic, so "every boot" in practice meant "moments after the
  // account is created, on the very next request" - discovered when it wiped
  // out a real verification account seconds after registering it in
  // production. Gated behind its own one-time marker (independent of
  // isFirstBootOfThisRelease above, which already fired on a prior deploy)
  // so it runs exactly once more and never again - a real future user is
  // free to use a .local-style email without it vanishing later.
  const { rows: sweepMarkerColumn } = await sql.query(
    `select 1 from information_schema.columns where table_name = 'app_settings' and column_name = 'testAccountsSweptAt'`
  );
  if (sweepMarkerColumn.length === 0) {
    await sql.query(`alter table app_settings add column if not exists "testAccountsSweptAt" timestamptz`);
    for (const domainPattern of ["%@example.com", "%.local"]) {
      await sql.query(`delete from units where "propertyId" in (select id from properties where "ownerEmail" like $1)`, [domainPattern]);
      await sql.query(`delete from properties where "ownerEmail" like $1`, [domainPattern]);
      await sql.query(`delete from rental_applications where "tenantEmail" like $1 or "ownerEmail" like $1`, [domainPattern]);
      await sql.query(`delete from maintenance_requests where "tenantName" in (select name from members where email like $1)`, [domainPattern]);
      await sql.query(`delete from payments where "tenantName" in (select name from members where email like $1)`, [domainPattern]);
      await sql.query(`delete from members where email like $1`, [domainPattern]);
    }
    await sql.query(`
      insert into app_settings (id, "testAccountsSweptAt") values ('singleton', now())
      on conflict (id) do update set "testAccountsSweptAt" = now()
    `);
  }
};

// Seeds only the platform owner account. upsertIgnoreDuplicates never
// overwrites a row that already exists, so this is safe to run on every
// cold start without clobbering a changed admin password.
const ensureSeedData = async () => {
  const seedMembers: PlatformMember[] = SEED_MEMBERS.map(member => {
    const { password, ...rest } = member;
    return password ? { ...rest, passwordHash: hashPassword(password) } : rest;
  });

  await Promise.all([
    upsertIgnoreDuplicates("members", seedMembers, "id"),
    upsertIgnoreDuplicates(
      "app_settings",
      [{ id: "singleton", tenantBalance: DEFAULT_TENANT_BALANCE, settlementConfig: DEFAULT_SETTLEMENT_CONFIG }],
      "id"
    )
  ]);
};

migrateSchema()
  .then(ensureSeedData)
  .catch(err => {
    console.error("Failed to migrate/seed Renziy data in Postgres:", err);
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

// Several notification triggers only have a display name to go on (e.g. a
// unit's tenantName) rather than an email - this resolves the actual
// recipient address so the notification can be scoped to them.
const findMemberEmailByName = async (role: PlatformMember['role'], name?: string): Promise<string | undefined> => {
  if (!name) return undefined;
  const member = await selectOne<{ email: string }>("members", [["role", "=", role], ["name", "=", name]]);
  return member?.email;
};

const portfolioPropertyNames = async (email: string) => {
  const rows = await selectRows<{ name: string }>("properties", [["ownerEmail", "=", normalizeEmail(email)]]);
  return rows.map(row => row.name);
};

// Resolves a tenant's own unit the same way the client infers "my
// apartment": by the property/unit recorded on their member profile, falling
// back to whichever unit lists them by name. Returns null for a tenant who
// hasn't been assigned a unit yet.
const findTenantOwnUnit = async (session: SessionPayload): Promise<Unit | null> => {
  const member = await findOwnMember(session);
  if (!member) return null;
  if (member.propertyName && member.unitNumber) {
    const unit = await selectOne<Unit>("units", [
      ["propertyName", "=", member.propertyName],
      ["unitNumber", "=", member.unitNumber]
    ]);
    if (unit) return unit;
  }
  return await selectOne<Unit>("units", [["tenantName", "=", member.name]]);
};

// Tops up every genuinely-occupied unit's balance by one rentAmount for each
// calendar month that's passed since it was last billed, run lazily on read
// rather than via a cron job (no scheduler in this deployment). A unit is
// only billed if its tenantName matches a real registered tenant - excludes
// placeholder "Occupied" units auto-generated by property creation that
// were never actually claimed by a real member. A never-billed unit is
// charged exactly one month (not backdated further), since there's no way
// to know how long ago they actually moved in. Cheap to call on every
// request: the WHERE clause makes it a no-op once everything is caught up
// for the current month.
const runMonthlyBilling = async (): Promise<void> => {
  await sql.query(`
    UPDATE units u
    SET
      balance = u.balance + u."rentAmount" * LEAST(GREATEST(
        (EXTRACT(YEAR FROM p.current_month)::int * 12 + EXTRACT(MONTH FROM p.current_month)::int)
        - (EXTRACT(YEAR FROM COALESCE(u."lastBilledDate", p.current_month - INTERVAL '1 month'))::int * 12
           + EXTRACT(MONTH FROM COALESCE(u."lastBilledDate", p.current_month - INTERVAL '1 month'))::int),
        0
      ), 12),
      "lastBilledDate" = p.current_month
    FROM (SELECT date_trunc('month', now())::date AS current_month) p
    WHERE u.status = 'Occupied'
      AND EXISTS (SELECT 1 FROM members m WHERE m.role = 'tenant' AND m.name = u."tenantName")
      AND (u."lastBilledDate" IS NULL OR u."lastBilledDate" < p.current_month)
  `);
};

// Settlement (payout) routing is per-landlord, not a single platform-wide
// value - a tenant needs their own landlord's details, a landlord needs
// their own, and anyone else (no landlord in context) gets the neutral
// default rather than another account's real bank/M-Pesa details.
const resolveSettlementOwnerEmail = async (session: SessionPayload): Promise<string | null> => {
  if (session.role === 'landlord') return normalizeEmail(session.email);
  if (session.role === 'tenant') {
    const unit = await findTenantOwnUnit(session);
    if (!unit) return null;
    const property = await selectOne<{ ownerEmail?: string }>("properties", [["id", "=", unit.propertyId]]);
    return property?.ownerEmail ? normalizeEmail(property.ownerEmail) : null;
  }
  return null;
};

const getSettlementConfigFor = async (ownerEmail: string | null): Promise<SettlementConfig> => {
  if (!ownerEmail) return DEFAULT_SETTLEMENT_CONFIG;
  const row = await selectOne<{ settlementConfig: SettlementConfig }>("settlement_configs", [["ownerEmail", "=", ownerEmail]]);
  return row ? { ...DEFAULT_SETTLEMENT_CONFIG, ...row.settlementConfig } : DEFAULT_SETTLEMENT_CONFIG;
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
      unread: true,
      recipientEmail: adminAccountEmail
    });
    const token = signSession({ email: member.email, role: member.role, exp: Date.now() + sessionTtlMs });
    res.json({ token, member: scrubMember(member) });
  }));

  const SETTLEMENT_MPESA_TYPES = ['Paybill', 'BuyGoods', 'PhoneNumber'] as const;

  app.get("/api/settlement", asyncHandler(async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    const ownerEmail = await resolveSettlementOwnerEmail(session);
    res.json(await getSettlementConfigFor(ownerEmail));
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

    const ownerEmail = normalizeEmail(session.email);
    const current = await getSettlementConfigFor(ownerEmail);
    const settlementConfig = { ...current, ...updates };
    await upsertRow("settlement_configs", { ownerEmail, settlementConfig }, "ownerEmail");
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
    await runMonthlyBilling();
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
      // but strangers have no reason to see who lives in an occupied unit,
      // or another household's outstanding rent balance or billing history.
      const { tenantName, tenantAvatar, lockReason, balance, lastBilledDate, ...publicUnit } = unit;
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
      const tenantEmail = await findMemberEmailByName('tenant', updatedUnit.tenantName);
      if (tenantEmail) {
        await insertRow("notifications", {
          id: `notif-${Date.now()}`,
          title: isLocked ? 'Smart Lock Engaged' : 'Smart Lock Released',
          message: isLocked
            ? `Your unit ${updatedUnit.unitNumber} at ${updatedUnit.propertyName} has been locked by the landlord. Reason: ${updatedUnit.lockReason}. Settle your payments immediately to reactivate.`
            : `Your unit ${updatedUnit.unitNumber} at ${updatedUnit.propertyName} has been unlocked. Thank you for your payment.`,
          date: 'Just now',
          type: 'payment',
          unread: true,
          recipientEmail: tenantEmail
        });
      }
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

    // A landlord recording a manual payment for a tenant clears that
    // tenant's own outstanding balance (not anyone else's).
    if (status === undefined || status === 'Paid') {
      const payingUnit = await selectOne<{ id: string }>("units", [["tenantName", "=", tenantName]]);
      if (payingUnit) {
        await updateRows("units", { balance: 0 }, [["id", "=", payingUnit.id]]);
      }
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
      unread: true,
      recipientEmail: normalizeEmail(session.email)
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

    const repairTenantEmail = await findMemberEmailByName('tenant', foundRequest.tenantName);
    if (repairTenantEmail) {
      await insertRow("notifications", {
        id: `notif-${Date.now()}`,
        title: 'Repair Status Updated',
        message: `Repair "${foundRequest.title}" for ${foundRequest.tenantName} is now marked as ${status}.`,
        date: 'Just now',
        type: 'maintenance',
        unread: true,
        recipientEmail: repairTenantEmail
      });
    }

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

    const assignedTenantEmail = await findMemberEmailByName('tenant', updatedRequest.tenantName);
    await Promise.all([
      insertRow("notifications", {
        id: `notif-worker-${Date.now()}`,
        title: 'Worker Assigned',
        message: `${worker.name} has been contacted for "${updatedRequest.title}" at ${updatedRequest.propertyName} (${updatedRequest.unitNumber}).`,
        date: 'Just now',
        type: 'maintenance',
        unread: true,
        recipientEmail: worker.email
      }),
      ...(assignedTenantEmail ? [insertRow("notifications", {
        id: `notif-worker-tenant-${Date.now()}`,
        title: 'Technician Assigned',
        message: `${worker.name} has been assigned to your repair request "${updatedRequest.title}".`,
        date: 'Just now',
        type: 'maintenance',
        unread: true,
        recipientEmail: assignedTenantEmail
      })] : [])
    ]);

    res.json(updatedRequest);
  }));

  app.get("/api/notifications", asyncHandler(async (req, res) => {
    const session = await requireSession(req, res);
    if (!session) return;
    // Admin keeps the unscoped platform-wide activity feed; everyone else
    // only sees notifications actually addressed to them.
    if (session.role === 'admin') {
      return res.json(await selectRows("notifications", [], { orderBy: "createdAt", desc: true }));
    }
    res.json(await selectRows("notifications", [["recipientEmail", "=", normalizeEmail(session.email)]], { orderBy: "createdAt", desc: true }));
  }));

  app.post("/api/notifications/read", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant', 'landlord', 'worker', 'admin']);
    if (!session) return;
    if (session.role === 'admin') {
      await updateRows("notifications", { unread: false }, [["id", "!=", ""]]);
    } else {
      await updateRows("notifications", { unread: false }, [["recipientEmail", "=", normalizeEmail(session.email)]]);
    }
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
    const existingMember = await selectOne<PlatformMember>("members", [["email", "=", sanitized.email], ["role", "=", role]]);
    const member: PlatformMember = {
      ...sanitized,
      role,
      id: existingMember?.id || req.body.id || `member-${Date.now()}`,
      joinDate: existingMember?.joinDate || req.body.joinDate || new Date().toISOString().split('T')[0],
      status: req.body.status || existingMember?.status || 'Active'
    };

    // A real UPDATE, not delete-then-insert - sanitizeMemberInput never
    // includes password/passwordHash, so this endpoint can't set one; if it
    // instead deleted and reinserted an existing self-registered tenant or
    // worker, it would silently wipe their password and lock them out. This
    // is exactly the path a landlord's "Register Tenant" flow hits when
    // linking a tenant who already has their own account.
    if (existingMember) {
      await updateRows("members", member, [["id", "=", existingMember.id]]);
    } else {
      await insertRow("members", member);
    }
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
      unread: true,
      recipientEmail: adminAccountEmail
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

    if (application.ownerEmail) {
      await insertRow("notifications", {
        id: `notif-rental-${Date.now()}`,
        title: 'New House Request',
        message: `${application.tenantName} requested ${application.propertyName} - Unit ${application.unitNumber}.`,
        date: 'Just now',
        type: 'lease',
        unread: true,
        recipientEmail: normalizeEmail(application.ownerEmail)
      });
    }

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

    if (paidApplication.ownerEmail) {
      await insertRow("notifications", {
        id: `notif-rental-paid-${Date.now()}`,
        title: 'House Request Rent Paid',
        message: `${paidApplication.tenantName} paid KES ${paidApplication.rentAmount.toLocaleString()} for ${paidApplication.propertyName} - Unit ${paidApplication.unitNumber}.`,
        date: 'Just now',
        type: 'payment',
        unread: true,
        recipientEmail: normalizeEmail(paidApplication.ownerEmail)
      });
    }

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
      unread: true,
      recipientEmail: normalizeEmail(approvedApplication.tenantEmail)
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
    const session = await requireSession(req, res);
    if (!session) return;
    if (session.role !== 'tenant') {
      // Only a tenant has a personal rent balance - every other role reads
      // pending totals from the units list they already have access to.
      return res.json({ tenantBalance: 0, dueDate: null, daysOverdue: 0 });
    }
    await runMonthlyBilling();
    const unit = await findTenantOwnUnit(session);
    const tenantBalance = unit?.balance ?? 0;

    // dueDate/daysOverdue tell the tenant portal when rent is (or was) due,
    // derived from the same monthly cycle runMonthlyBilling() bills against.
    // Every date here is built from a plain Y-M-D string anchored to UTC
    // noon (never local-midnight Date objects) so day-of-month arithmetic
    // can't drift a calendar day from the server's local timezone.
    let dueDate: string | null = null;
    let daysOverdue = 0;
    if (unit) {
      const lastBilledStr = toDateOnlyString(unit.lastBilledDate);
      const lastBilled = lastBilledStr ? new Date(`${lastBilledStr}T12:00:00Z`) : null;
      if (tenantBalance > 0 && lastBilled) {
        dueDate = lastBilledStr;
        daysOverdue = Math.max(0, Math.round((Date.now() - lastBilled.getTime()) / 86_400_000));
      } else {
        const next = lastBilled ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 12));
        next.setUTCMonth(next.getUTCMonth() + 1);
        dueDate = next.toISOString().split('T')[0];
      }
    }

    res.json({ tenantBalance, dueDate, daysOverdue });
  }));

  app.post("/api/balance/pay", asyncHandler(async (req, res) => {
    const session = await requireRole(req, res, ['tenant']);
    if (!session) return;
    const { method } = req.body;
    if (!method) {
      return res.status(400).json({ error: "Missing payment method details" });
    }
    if (!isOneOf(PAYMENT_METHODS, method)) {
      return res.status(400).json({ error: "Unsupported payment method" });
    }

    const activeUnit = await findTenantOwnUnit(session);
    if (!activeUnit) {
      return res.status(400).json({ error: "No unit is assigned to your account yet. Browse Find Houses to request one." });
    }
    const originalAmount = activeUnit.balance ?? 0;
    if (originalAmount <= 0) {
      return res.status(400).json({ error: "There is no outstanding balance to pay." });
    }

    // Settle just this tenant's own unit, and auto-release its smart lock.
    await updateRows("units", { balance: 0, isLocked: false, lockReason: null }, [["id", "=", activeUnit.id]]);

    const member = await findOwnMember(session);
    const payingTenantName = member?.name || activeUnit.tenantName || session.email;

    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantName: payingTenantName,
      unitNumber: activeUnit.unitNumber,
      propertyName: activeUnit.propertyName,
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
      unread: true,
      recipientEmail: normalizeEmail(session.email)
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
