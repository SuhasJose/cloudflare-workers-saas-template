// Stripe webhook verification and event handler helpers
// Works in Cloudflare Workers / Edge runtime using crypto.subtle for HMAC.
export async function verifyStripeSignature(rawBody: string, signatureHeader: string | null, webhookSecret: string) {
  if (!signatureHeader) throw new Error('missing stripe signature header')

  // Parse header: format "t=TIMESTAMP,v1=SIG1,v0=SIG0"
  const parts = signatureHeader.split(',').map(p => p.trim())
  const map: Record<string,string> = {}
  for (const p of parts) {
    const [k,v] = p.split('=')
    if (k && v) map[k] = v
  }
  const t = map['t']
  const v1 = map['v1']
  if (!t || !v1) throw new Error('invalid signature header')

  const signedPayload = `${t}.${rawBody}`

  // Compute HMAC-SHA256(signedPayload) with webhookSecret and compare to v1
  const encoder = new TextEncoder()
  const keyData = encoder.encode(webhookSecret)
  const imported = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuf = await crypto.subtle.sign('HMAC', imported, encoder.encode(signedPayload))
  const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2,'0')).join('')

  // constant-time compare
  const compare = (a: string, b: string) => {
    if (a.length !== b.length) return false
    let res = 0
    for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return res === 0
  }

  // stripe's v1 is hex; if not, adapt accordingly
  if (!compare(computed, v1)) {
    // try lowercase
    if (!compare(computed.toLowerCase(), v1.toLowerCase())) {
      throw new Error('signature_mismatch')
    }
  }

  // Safe to parse
  const event = JSON.parse(rawBody)
  return event
}

export async function handleStripeEvent(env: any, event: any) {
  // Basic idempotency: store provider event id; skip if exists
  const db = env.DB
  if (!db) throw new Error('D1 binding (DB) not configured in env')

  const provider = 'stripe'
  const eventId = event.id

  // Upsert provider_events; if already exists, skip further processing
  const exists = await db.prepare('SELECT 1 FROM provider_events WHERE provider = ? AND event_id = ?').bind(provider, eventId).first()
  if (exists) {
    console.log('Skipping already-processed Stripe event', eventId)
    return
  }

  // store raw payload (for audit)
  await db.prepare('INSERT INTO provider_events (provider, event_id, payload, received_at) VALUES (?, ?, ?, ?)').bind(
    provider, eventId, JSON.stringify(event), Date.now()
  ).run()

  const type = event.type
  // Handle a few common event types
  if (type === 'checkout.session.completed') {
    const session = event.data.object
    // session.subscription holds Stripe subscription id (for subscription checkouts)
    const subscriptionId = session.subscription || null
    const customer = session.customer || null
    const metadata = session.metadata || {}
    const planId = session.display_items?.[0]?.price?.id || session.metadata?.planId || session.metadata?.price || null

    // Insert or update subscriptions table
    const now = Date.now()
    const providerSubscriptionId = subscriptionId ?? `session_${session.id}`

    await db.prepare(`INSERT OR REPLACE INTO subscriptions
      (id, team_id, provider, provider_subscription_id, plan_id, status, current_period_end, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        providerSubscriptionId,
        metadata.teamId || metadata.team_id || null,
        provider,
        providerSubscriptionId,
        planId,
        'active',
        session.expires_at ? session.expires_at * 1000 : null,
        JSON.stringify(session.metadata || {}),
        now,
        now
      ).run()

    // Optionally create an initial invoice record (if present)
    if (session.payment && session.payment.amount_total) {
      await db.prepare(`INSERT INTO invoices
        (id, subscription_id, provider_invoice_id, amount, currency, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          `inv_${session.id}`,
          providerSubscriptionId,
          null,
          session.payment.amount_total || 0,
          session.payment.currency || 'usd',
          'paid',
          now
        ).run()
    }
  } else if (type === 'invoice.payment_succeeded') {
    const invoice = event.data.object
    const providerInvoiceId = invoice.id
    const providerSubscriptionId = invoice.subscription
    const amount = invoice.amount_paid || invoice.total || 0
    const currency = invoice.currency || 'usd'
    const now = Date.now()

    // Insert invoice
    await env.DB.prepare(`INSERT OR REPLACE INTO invoices
      (id, subscription_id, provider_invoice_id, amount, currency, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      providerInvoiceId,
      providerSubscriptionId,
      providerInvoiceId,
      amount,
      currency,
      'paid',
      now
    ).run()

    // Mark subscription active
    await env.DB.prepare(`UPDATE subscriptions SET status = ?, updated_at = ? WHERE provider_subscription_id = ?`)
      .bind('active', now, providerSubscriptionId).run()
  } else if (type === 'invoice.payment_failed') {
    const invoice = event.data.object
    const providerInvoiceId = invoice.id
    const providerSubscriptionId = invoice.subscription
    const now = Date.now()
    await env.DB.prepare(`UPDATE invoices SET status = ? WHERE provider_invoice_id = ?`).bind('failed', providerInvoiceId).run()
    await env.DB.prepare(`UPDATE subscriptions SET status = ?, updated_at = ? WHERE provider_subscription_id = ?`).bind('past_due', now, providerSubscriptionId).run()
  } else if (type === 'customer.subscription.deleted' || type === 'customer.subscription.updated') {
    const sub = event.data.object
    const providerSubscriptionId = sub.id
    const now = Date.now()
    const status = sub.status || (type === 'customer.subscription.deleted' ? 'canceled' : sub.status)
    await env.DB.prepare(`UPDATE subscriptions SET status = ?, current_period_end = ?, updated_at = ? WHERE provider_subscription_id = ?`)
      .bind(status, sub.current_period_end ? sub.current_period_end * 1000 : null, now, providerSubscriptionId).run()
  } else {
    console.log('Unhandled stripe event type:', type)
  }
}