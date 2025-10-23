# Webhooks & Billing Migration Guide

## Files Added

- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `src/app/api/webhooks/lemonsqueezy/route.ts` - LemonSqueezy webhook handler
- `src/app/api/webhooks/paddle/route.ts` - Paddle webhook handler
- `src/lib/webhooks/stripe.ts` - Stripe webhook utilities
- `src/lib/webhooks/lemonsqueezy.ts` - LemonSqueezy webhook utilities
- `src/lib/webhooks/paddle.ts` - Paddle webhook utilities
- `src/db/migrations/001_create_billing_tables.sql` - SQL migration file
- `src/db/migrations/migrations.ts` - Migration manifest (array of SQL statements)
- `src/app/api/admin/migrate/route.ts` - Secure migration runner API endpoint

## Environment Variables

Set these as Cloudflare worker secrets or in GitHub Secrets:

### Webhook Secrets
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_SECRET_KEY` - Stripe secret key for checkout creation
- `LEMONSQUEEZY_WEBHOOK_SECRET` - LemonSqueezy webhook secret (suggested)
- `LEMONSQUEEZY_API_KEY` - LemonSqueezy API key
- `PADDLE_VENDOR_ID` - Paddle vendor ID
- `PADDLE_API_KEY` - Paddle API key
- `PADDLE_PUBLIC_KEY` - Paddle public key (if verifying RSA signature)

### Migration Secret
- `MIGRATION_SECRET` - Secret for authenticating migration API requests (required)

### Database Binding
- D1 database must be bound to `env.DB` in `wrangler.toml`

## Database Setup

### Prerequisites

1. **Add D1 Binding to wrangler.toml**

Add the following to your `wrangler.toml`:

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

2. **Set MIGRATION_SECRET**

Set the migration secret in your Cloudflare Worker:

```bash
# For production
wrangler secret put MIGRATION_SECRET

# For local development, add to .dev.vars
MIGRATION_SECRET=your-secret-here
```

**Important**: Choose a strong, random secret value. This protects your migration endpoint from unauthorized access.

### Running Migrations

#### Using the Migration API Endpoint

To run migrations in staging or production:

```bash
curl -X POST https://your-domain.com/api/admin/migrate \
  -H "x-migration-secret: your-secret-here" \
  -H "Content-Type: application/json"
```

#### Response Format

Successful response (200):
```json
{
  "success": true,
  "message": "Successfully executed 10 migration statements",
  "results": [
    {
      "statement": "CREATE TABLE IF NOT EXISTS users (...",
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

#### Verification

After running migrations, verify the tables were created:

```bash
# For local development
wrangler d1 execute your-database-name --local --command "SELECT name FROM sqlite_master WHERE type='table';"

# For production
wrangler d1 execute your-database-name --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see the following tables:
- `users`
- `teams`
- `subscriptions`
- `invoices`
- `provider_events`

#### Idempotency

The migration endpoint is designed to be idempotent:
- All SQL statements use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
- Running migrations multiple times is safe and won't cause errors
- Existing tables and indexes are left unchanged

## Testing Webhooks Locally

### Stripe

Use Stripe CLI to forward events:

```bash
stripe listen --forward-to localhost:8787/api/webhooks/stripe
```

Then trigger events:

```bash
stripe trigger checkout.session.completed
```

### LemonSqueezy / Paddle

Use provider test webhooks or public tunneling (ngrok) to forward to local dev URL:

```bash
ngrok http 8787
```

Then configure your webhook URL in the provider's dashboard to point to the ngrok URL.

## Important Notes

### Webhook Verification

- **Stripe**: Verification implemented using HMAC-SHA256 with the webhook secret. Tested approach works in edge runtimes that expose `crypto.subtle`.
- **LemonSqueezy** and **Paddle**: Verification is included as templates/placeholders. Confirm exact header names and signing algorithms in the providers' docs and adapt the verify functions.

### Database

- The SQL migration is written for SQLite/D1 (used by Cloudflare D1)
- Run migrations using the migration API endpoint described above
- Migrations are idempotent and can be run multiple times safely

### Security

- **Never commit your secrets to version control**
- Use different secrets for staging and production environments
- Consider restricting access to the migration endpoint via Cloudflare Access or similar tools
- The migration endpoint should only be called during deployment or maintenance windows

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