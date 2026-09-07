-- RENZIY data schema.
-- Run this once against your Vercel Postgres database before starting the
-- server with POSTGRES_URL set - e.g. paste it into the Vercel dashboard's
-- Storage -> your database -> Query tab, or `psql "$POSTGRES_URL" -f db/schema.sql`.
--
-- Column names intentionally match the app's existing camelCase TypeScript
-- field names 1:1 (quoted where they contain uppercase letters) so server.ts
-- can build queries directly from request-body objects without a separate
-- camelCase <-> snake_case mapping layer.
--
-- IDs stay `text` (the app generates its own string IDs, e.g. `req-<ms>`),
-- and there are no foreign key constraints - the app's data was never
-- strictly relational (e.g. units carry a denormalized propertyName), so
-- this mirrors that rather than introducing constraints that could reject
-- writes the in-memory version always accepted.
--
-- Money/amount fields use `double precision`, not `numeric` - the app has
-- only ever treated these as plain JS numbers (no decimal library anywhere),
-- and node-postgres-style drivers return `numeric` columns as strings (to
-- avoid silent precision loss), which would otherwise quietly turn every
-- rentAmount/amount/tenantBalance into a string the moment it round-trips
-- through the database.

create table if not exists properties (
  id text primary key,
  name text not null,
  address text not null,
  "unitsCount" integer not null default 0,
  "imageUrl" text,
  county text,
  constituency text,
  town text,
  neighborhood text,
  "specificLocation" text,
  description text,
  amenities jsonb,
  "contactPhone" text,
  "mapQuery" text,
  "availableForMarketplace" boolean,
  "ownerEmail" text
);
create index if not exists properties_owner_email_idx on properties ("ownerEmail");

create table if not exists units (
  id text primary key,
  "propertyId" text not null,
  "propertyName" text not null,
  "unitNumber" text not null,
  "rentAmount" double precision not null,
  status text not null,
  "tenantName" text,
  "tenantAvatar" text,
  "isLocked" boolean,
  "lockReason" text
);
create index if not exists units_property_id_idx on units ("propertyId");
create index if not exists units_tenant_name_idx on units ("tenantName");
create index if not exists units_property_name_idx on units ("propertyName");

create table if not exists payments (
  id text primary key,
  "tenantName" text not null,
  "unitNumber" text not null,
  "propertyName" text not null,
  date text not null,
  amount double precision not null,
  status text not null,
  "paymentMethod" text not null,
  code text not null,
  "createdAt" timestamptz not null default now()
);
create index if not exists payments_tenant_name_idx on payments ("tenantName");
create index if not exists payments_property_name_idx on payments ("propertyName");

create table if not exists maintenance_requests (
  id text primary key,
  title text not null,
  category text not null,
  urgency text not null,
  description text not null,
  status text not null,
  date text not null,
  photos jsonb not null default '[]'::jsonb,
  "technicianName" text,
  "technicianEmail" text,
  "technicianPhone" text,
  "technicianAvatar" text,
  "arrivalTime" text,
  "propertyName" text not null,
  "unitNumber" text not null,
  "tenantName" text not null,
  "createdAt" timestamptz not null default now()
);
create index if not exists maintenance_requests_property_name_idx on maintenance_requests ("propertyName");
create index if not exists maintenance_requests_technician_email_idx on maintenance_requests ("technicianEmail");
create index if not exists maintenance_requests_tenant_name_idx on maintenance_requests ("tenantName");

create table if not exists notifications (
  id text primary key,
  title text not null,
  message text not null,
  date text not null,
  type text not null,
  unread boolean not null default true,
  "createdAt" timestamptz not null default now()
);

create table if not exists members (
  id text primary key,
  role text not null,
  name text not null,
  phone text not null,
  email text not null,
  password text,
  "passwordHash" text,
  "avatarUrl" text,
  "propertyName" text,
  "unitNumber" text,
  "rentAmount" double precision,
  specialty text,
  "joinDate" text not null,
  status text not null
);
create index if not exists members_email_idx on members (email);
create index if not exists members_role_idx on members (role);

create table if not exists rental_applications (
  id text primary key,
  "propertyId" text not null,
  "propertyName" text not null,
  "unitId" text not null,
  "unitNumber" text not null,
  "rentAmount" double precision not null,
  "ownerEmail" text,
  "ownerPhone" text,
  "tenantName" text not null,
  "tenantEmail" text not null,
  "tenantPhone" text,
  "requestedAt" text not null,
  status text not null,
  "paymentCode" text,
  "approvedAt" text
);
create index if not exists rental_applications_tenant_email_idx on rental_applications ("tenantEmail");
create index if not exists rental_applications_owner_email_idx on rental_applications ("ownerEmail");

-- Replaces the in-memory passwordResetChallenges Map (which never survived a
-- serverless cold start any better than the old JSON file did). expiresAt is
-- a millisecond epoch timestamp - double precision represents integers up to
-- 2^53 exactly, comfortably enough for that.
create table if not exists password_reset_challenges (
  key text primary key,
  "memberId" text not null,
  "codeHash" text not null,
  "expiresAt" double precision not null,
  attempts integer not null default 0
);

-- Single-row table for the two standalone scalars (tenantBalance,
-- settlementConfig). Always exactly one row, id = 'singleton'.
create table if not exists app_settings (
  id text primary key,
  "tenantBalance" double precision not null default 0,
  "settlementConfig" jsonb not null default '{}'::jsonb
);
