-- =====================================================================
-- ROADRESCUE database schema (SQLite / libSQL)
-- MGT3151 E-Business, E-Commerce and E-Governance - prototype
-- All data in this database is FICTITIOUS. Payments are MOCK only.
-- Data minimisation: we never store National ID numbers, mobile-money
-- PINs, OTPs, card numbers or exact GPS coordinates.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- Everyone who can log in: customers, mechanics, drivers and admins
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  phone           TEXT    CHECK (phone IS NULL OR length(phone) = 10),
  password_hash   TEXT    NOT NULL,
  role            TEXT    NOT NULL CHECK (role IN ('customer', 'mechanic', 'driver', 'admin')),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Extra details for helpers: mechanics AND drivers (users.role says which).
-- Verification is a MOCK admin approval step. No real ID documents or photos are stored:
-- avatar_style only picks an illustrated cartoon face.
CREATE TABLE IF NOT EXISTS provider_profiles (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  area            TEXT    NOT NULL,
  skills          TEXT    NOT NULL DEFAULT '',            -- mechanics: skills; drivers: licence / experience
  status          TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED')),
  is_online       INTEGER NOT NULL DEFAULT 1 CHECK (is_online IN (0, 1)),
  avatar_style    TEXT,
  approved_by     INTEGER REFERENCES users(id),
  approved_at     TEXT
);

-- What a customer drives and the area they last asked for help in, so the next request
-- is quicker. Area only - never GPS coordinates.
CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle_make    TEXT,
  vehicle_model   TEXT    NOT NULL DEFAULT '',
  vehicle_body    TEXT,
  vehicle_colour  TEXT    NOT NULL DEFAULT '',
  last_area       TEXT,
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- The service catalogue (what customers can order). provider_type says who does the job.
CREATE TABLE IF NOT EXISTS services (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  price           INTEGER NOT NULL CHECK (price > 0),          -- UGX, labour + callout
  est_minutes     INTEGER NOT NULL CHECK (est_minutes > 0),
  provider_type   TEXT    NOT NULL DEFAULT 'mechanic' CHECK (provider_type IN ('mechanic', 'driver')),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Partner garages shown on the map (businesses, so their address location is public).
CREATE TABLE IF NOT EXISTS garages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  area            TEXT    NOT NULL,
  landmark        TEXT    NOT NULL,
  lat             REAL    NOT NULL CHECK (lat BETWEEN -1 AND 2),
  lng             REAL    NOT NULL CHECK (lng BETWEEN 32 AND 33.5),
  specialties     TEXT    NOT NULL DEFAULT '',
  hours           TEXT    NOT NULL DEFAULT '',
  rating          REAL    CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  is_partner      INTEGER NOT NULL DEFAULT 1 CHECK (is_partner IN (0, 1)),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Spare parts sold as add-ons. stock can never go below zero.
CREATE TABLE IF NOT EXISTS parts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  price           INTEGER NOT NULL CHECK (price > 0),          -- UGX
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- Each customer's cart. One service at a time, any number of parts.
CREATE TABLE IF NOT EXISTS cart_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind            TEXT    NOT NULL CHECK (kind IN ('SERVICE', 'PART')),
  ref_id          INTEGER NOT NULL,
  qty             INTEGER NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 10),
  added_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, kind, ref_id)
);

-- A roadside job / order
CREATE TABLE IF NOT EXISTS orders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no          TEXT    NOT NULL UNIQUE,
  customer_id       INTEGER NOT NULL REFERENCES users(id),
  mechanic_id       INTEGER REFERENCES users(id),     -- the assigned helper (a mechanic or a driver)
  service_id        INTEGER NOT NULL REFERENCES services(id),
  area              TEXT    NOT NULL,
  landmark          TEXT    NOT NULL,            -- e.g. "Opposite Shell Ntinda" (no GPS stored)
  vehicle           TEXT    NOT NULL,            -- e.g. "Toyota Premio, silver"
  problem_note      TEXT    NOT NULL DEFAULT '',
  status            TEXT    NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (status IN (
                      'PENDING_PAYMENT', 'SEARCHING', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS',
                      'AWAITING_CONFIRMATION', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED')),
  service_amount    INTEGER NOT NULL CHECK (service_amount >= 0),
  parts_amount      INTEGER NOT NULL DEFAULT 0 CHECK (parts_amount >= 0),
  total_amount      INTEGER NOT NULL CHECK (total_amount > 0),
  commission_amount INTEGER NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  paid_at           TEXT,
  accepted_at       TEXT,
  completed_at      TEXT,
  cancelled_at      TEXT,
  cancel_reason     TEXT
);

-- Snapshot of what was bought, so later price changes don't change old orders
CREATE TABLE IF NOT EXISTS order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind            TEXT    NOT NULL CHECK (kind IN ('SERVICE', 'PART')),
  ref_id          INTEGER NOT NULL,
  name            TEXT    NOT NULL,
  unit_price      INTEGER NOT NULL CHECK (unit_price > 0),
  qty             INTEGER NOT NULL CHECK (qty > 0),
  line_total      INTEGER NOT NULL CHECK (line_total > 0)
);

-- MOCK mobile-money payment, held in escrow until the customer confirms
CREATE TABLE IF NOT EXISTS payments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  idempotency_key   TEXT    NOT NULL UNIQUE,      -- stops the same order being charged twice
  method            TEXT    NOT NULL DEFAULT 'MOCK_MOMO' CHECK (method IN ('MOCK_MOMO', 'MOCK_AIRTEL')),
  payer_phone_masked TEXT   NOT NULL,             -- only "07X XXX X123" is kept
  amount            INTEGER NOT NULL CHECK (amount > 0),
  status            TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'FAILED')),
  provider_ref      TEXT,                          -- fake sandbox reference
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Every status change, for tracking and auditability
CREATE TABLE IF NOT EXISTS order_status_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status     TEXT,
  to_status       TEXT    NOT NULL,
  changed_by      INTEGER REFERENCES users(id),
  note            TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- After-sales: one review per completed order
CREATE TABLE IF NOT EXISTS reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  customer_id     INTEGER NOT NULL REFERENCES users(id),
  mechanic_id     INTEGER NOT NULL REFERENCES users(id),
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT    NOT NULL DEFAULT '' CHECK (length(comment) <= 500),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- After-sales: warranty claims (7 days) and disputes
CREATE TABLE IF NOT EXISTS claims (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id     INTEGER NOT NULL REFERENCES users(id),
  type            TEXT    NOT NULL CHECK (type IN ('WARRANTY', 'DISPUTE')),
  description     TEXT    NOT NULL CHECK (length(description) BETWEEN 10 AND 500),
  status          TEXT    NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVISIT', 'REFUNDED', 'REJECTED')),
  resolution_note TEXT,
  resolved_by     INTEGER REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at     TEXT
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message         TEXT    NOT NULL,
  link            TEXT,
  is_read         INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Audit trail: who did what, when (kept 12 months)
CREATE TABLE IF NOT EXISTS audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id        INTEGER REFERENCES users(id),
  actor_role      TEXT,
  action          TEXT    NOT NULL,
  entity          TEXT,
  entity_id       TEXT,
  details         TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer   ON orders(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_mechanic   ON orders(mechanic_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status, area);
CREATE INDEX IF NOT EXISTS idx_history_order     ON order_status_history(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user        ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_log(action, entity_id);
CREATE INDEX IF NOT EXISTS idx_claims_status     ON claims(status);
CREATE INDEX IF NOT EXISTS idx_providers_area    ON provider_profiles(status, area);
CREATE INDEX IF NOT EXISTS idx_garages_area      ON garages(area);
