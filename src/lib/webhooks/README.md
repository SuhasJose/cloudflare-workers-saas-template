# Webhooks Migration Guide

This guide explains how to set up and run database migrations for the webhook system.

## Overview

The webhook system uses two main database tables:

- **`provider_events`**: Stores webhook events received from external providers (Stripe, GitHub, etc.)
- **`subscriptions`**: Manages webhook subscription configurations and metadata

## Prerequisites

Before running migrations, ensure you have:

1. A D1 database binding named `DB` configured in your `wrangler.toml`
2. A `MIGRATION_SECRET` environment variable set in your Cloudflare Worker secrets

## Configuration

### 1. Add D1 Binding to wrangler.toml

Add the following D1 database binding to your `wrangler.toml`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-database-name",
      "database_id": "your-database-id"
    }
  ]
}
```

### 2. Set MIGRATION_SECRET

Set the migration secret in your Cloudflare Worker:

```bash
# For production
wrangler secret put MIGRATION_SECRET

# For local development, add to .dev.vars
MIGRATION_SECRET=your-secret-here
```

**Important**: Choose a strong, random secret value. This protects your migration endpoint from unauthorized access.

## Running Migrations

### Using curl

To run migrations in staging or production:

```bash
curl -X POST https://your-domain.com/api/admin/migrate \
  -H "x-migration-secret: your-secret-here" \
  -H "Content-Type: application/json"
```

### Using Postman or Similar Tools

- **Method**: POST
- **URL**: `https://your-domain.com/api/admin/migrate`
- **Headers**:
  - `x-migration-secret`: `your-secret-here`

### Response Format

Successful response (200):
```json
{
  "success": true,
  "message": "Successfully executed 12 migration statements",
  "results": [
    {
      "statement": "CREATE TABLE IF NOT EXISTS provider_events (...",
      "success": true
    },
    // ... more results
  ]
}
```

Error response (401 - Unauthorized):
```json
{
  "success": false,
  "message": "Unauthorized: Invalid or missing migration secret"
}
```

Error response (500 - DB not configured):
```json
{
  "success": false,
  "message": "Database binding (DB) not configured. Please add D1 binding named 'DB' to wrangler.toml"
}
```

## Verification

After running migrations, verify the tables were created:

```bash
# For local development
wrangler d1 execute your-database-name --local --command "SELECT name FROM sqlite_master WHERE type='table';"

# For production
wrangler d1 execute your-database-name --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see `provider_events` and `subscriptions` in the output.

## Idempotency

The migration endpoint is designed to be idempotent:

- All SQL statements use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
- Running migrations multiple times is safe and won't cause errors
- Existing tables and indexes are left unchanged

## Troubleshooting

### "Database binding (DB) not configured"

- Ensure you've added the DB binding to `wrangler.toml`
- Redeploy your worker after making changes
- For local development, restart your dev server

### "Unauthorized: Invalid or missing migration secret"

- Verify the `x-migration-secret` header is set correctly
- Ensure `MIGRATION_SECRET` is configured in Cloudflare Worker secrets
- Check for typos in the secret value

### Migration Failures

If individual statements fail:

1. Check the `results` array in the response for specific error messages
2. Review the SQL statements in `src/db/migrations/migrations.ts`
3. Verify your D1 database is accessible and has sufficient permissions

## Security Notes

- **Never commit your `MIGRATION_SECRET` to version control**
- Use different secrets for staging and production environments
- Consider restricting access to the migration endpoint via Cloudflare Access or similar tools
- The migration endpoint should only be called during deployment or maintenance windows

## Migration File

The migration statements are defined in `src/db/migrations/migrations.ts`. This file exports an array of SQL statements that are executed in order.

To add new migrations:

1. Edit `src/db/migrations/migrations.ts`
2. Add your SQL statements to the `migrations` array
3. Ensure statements are idempotent (use `IF NOT EXISTS` where appropriate)
4. Deploy your changes
5. Run the migration endpoint
