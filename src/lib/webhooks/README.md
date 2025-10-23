````markdown
# Webhooks & Billing migration notes

Files added:
- src/app/api/webhooks/stripe/route.ts
- src/app/api/webhooks/lemonsqueezy/route.ts
- src/app/api/webhooks/paddle/route.ts
- src/lib/webhooks/stripe.ts
- src/lib/webhooks/lemonsqueezy.ts
- src/lib/webhooks/paddle.ts
- src/db/migrations/001_create_billing_tables.sql
- src/db/schema.ts

Environment variables (set as Cloudflare worker secrets or GitHub Secrets):
- STRIPE_WEBHOOK_SECRET
- STRIPE_SECRET_KEY (for checkout creation)
- LEMONSQUEEZY_WEBHOOK_SECRET (suggested)
- LEMONSQUEEZY_API_KEY
- PADDLE_VENDOR_ID
- PADDLE_API_KEY
- PADDLE_PUBLIC_KEY (if verifying Paddle RSA signature)
- DB binding: D1 database bound to env.DB

Testing locally:
- Stripe: use Stripe CLI to forward events:
  stripe listen --forward-to localhost:8787/api/webhooks/stripe
  Then trigger events (e.g., stripe trigger checkout.session.completed)
- LemonSqueezy / Paddle: use provider test webhooks or public tunneling (ngrok) to forward to local dev URL.

Important notes:
- Stripe verification implemented using HMAC-SHA256 with the webhook secret; tested approach works in edge runtimes that expose crypto.subtle.
- LemonSqueezy and Paddle verification are included as templates/placeholders — confirm exact header names and signing algorithms in the providers' docs and adapt the verify functions.
- The SQL migration is written for SQLite/D1 (used by Cloudflare D1). Run it once when provisioning DB (add migration runner).
````