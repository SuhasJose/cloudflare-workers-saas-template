// Paddle webhook handler (placeholder)
// Real verification requires Paddle public key validation of p_signature (see Paddle docs).
export async function handlePaddleEvent(env: any, params: Record<string, string>) {
  const db = env.DB
  if (!db) throw new Error('D1 binding (DB) not configured')

  // Basic idempotency key: use alert_id if present
  const eventId = params['alert_id'] || (params['p_signature'] ? params['p_signature'].slice(0, 64) : `paddle_${Date.now()}`)
  const exists = await db.prepare('SELECT 1 FROM provider_events WHERE provider = ? AND event_id = ?').bind('paddle', eventId).first()
  if (exists) return

  await db.prepare('INSERT INTO provider_events (provider, event_id, payload, received_at) VALUES (?, ?, ?, ?)').bind(
    'paddle', eventId, JSON.stringify(params), Date.now()
  ).run()

  // Map Paddle alert types to subscriptions/invoices as needed
  // TODO: verify signature using Paddle public key and update subscriptions/invoices
  console.log('Received Paddle event', eventId, params['alert_name'])
}