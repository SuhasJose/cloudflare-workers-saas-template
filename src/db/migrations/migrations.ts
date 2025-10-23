/**
 * Migration manifest for database schema changes
 * 
 * This file exports an array of SQL statements that can be executed
 * to create or modify database tables. Each statement is designed to be
 * idempotent using "IF NOT EXISTS" clauses.
 * 
 * Tables included:
 * - provider_events: Stores webhook events from external providers (Stripe, etc.)
 * - subscriptions: Stores subscription information for webhook endpoints
 */

export const migrations = [
  // Create provider_events table for storing webhook events
  `CREATE TABLE IF NOT EXISTS provider_events (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    provider TEXT NOT NULL,
    eventType TEXT NOT NULL,
    eventId TEXT NOT NULL,
    payload TEXT NOT NULL,
    processedAt INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    errorMessage TEXT,
    retryCount INTEGER DEFAULT 0 NOT NULL
  );`,

  // Create index on provider_events for efficient querying by provider
  `CREATE INDEX IF NOT EXISTS provider_events_provider_idx ON provider_events (provider);`,

  // Create index on provider_events for efficient querying by event type
  `CREATE INDEX IF NOT EXISTS provider_events_event_type_idx ON provider_events (eventType);`,

  // Create index on provider_events for efficient querying by event ID
  `CREATE INDEX IF NOT EXISTS provider_events_event_id_idx ON provider_events (eventId);`,

  // Create index on provider_events for efficient querying by status
  `CREATE INDEX IF NOT EXISTS provider_events_status_idx ON provider_events (status);`,

  // Create index on provider_events for efficient querying by created date
  `CREATE INDEX IF NOT EXISTS provider_events_created_at_idx ON provider_events (createdAt);`,

  // Create subscriptions table for managing webhook subscriptions
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    secret TEXT,
    isActive INTEGER DEFAULT 1 NOT NULL,
    lastEventAt INTEGER,
    eventCount INTEGER DEFAULT 0 NOT NULL,
    metadata TEXT
  );`,

  // Create index on subscriptions for efficient querying by provider
  `CREATE INDEX IF NOT EXISTS subscriptions_provider_idx ON subscriptions (provider);`,

  // Create index on subscriptions for efficient querying by active status
  `CREATE INDEX IF NOT EXISTS subscriptions_is_active_idx ON subscriptions (isActive);`,

  // Create unique index on subscriptions to prevent duplicate provider/endpoint combinations
  `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_endpoint_idx ON subscriptions (provider, endpoint);`,
];
