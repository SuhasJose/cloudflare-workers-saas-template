/**
 * Migration manifest for database schema changes
 * 
 * This file exports an array of SQL statements that can be executed
 * to create or modify database tables. Each statement is designed to be
 * idempotent using "IF NOT EXISTS" clauses.
 * 
 * Based on: src/db/migrations/001_create_billing_tables.sql
 * 
 * Tables included:
 * - users: Basic user information
 * - teams: Team/organization information
 * - subscriptions: Subscription information for billing
 * - invoices: Invoice records
 * - provider_events: Stores webhook events from external providers (Stripe, etc.)
 */

export const migrations = [
  // Create users table
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    created_at INTEGER
  );`,

  // Create teams table
  `CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT,
    owner_id TEXT,
    created_at INTEGER
  );`,

  // Create subscriptions table
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

  // Create index on subscriptions for team_id
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_team ON subscriptions(team_id);`,

  // Create invoices table
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    subscription_id TEXT,
    provider_invoice_id TEXT UNIQUE,
    amount INTEGER,
    currency TEXT,
    status TEXT,
    created_at INTEGER
  );`,

  // Create index on invoices for subscription_id
  `CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);`,

  // Create provider_events table for webhook events
  `CREATE TABLE IF NOT EXISTS provider_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT,
    event_id TEXT,
    payload TEXT,
    received_at INTEGER
  );`,

  // Create unique index on provider_events to prevent duplicate events
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_events_unique ON provider_events(provider, event_id);`,
];
