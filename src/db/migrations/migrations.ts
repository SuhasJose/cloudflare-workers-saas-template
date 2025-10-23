export const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT,
    owner_id TEXT,
    created_at INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    team_id TEXT,
    provider TEXT,
    provider_subscription_id TEXT UNIQUE,
    plan_id TEXT,
    status TEXT,
    current_period_end INTEGER,
    metadata TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_team ON subscriptions(team_id);`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    subscription_id TEXT,
    provider_invoice_id TEXT UNIQUE,
    amount INTEGER,
    currency TEXT,
    status TEXT,
    created_at INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);`,
  `CREATE TABLE IF NOT EXISTS provider_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT,
    event_id TEXT,
    payload TEXT,
    received_at INTEGER
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_events_unique ON provider_events(provider, event_id);`
];