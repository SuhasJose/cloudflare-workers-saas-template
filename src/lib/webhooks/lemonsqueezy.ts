// Minimal LemonSqueezy webhook helpers
export async function verifyLemonSignature(rawBody: string, signatureHeader: string | null, webhookSecret: string) {
  if (!signatureHeader) throw new Error('missing signature header for LemonSqueezy')
  // NOTE: Confirm LemonSqueezy exact header and signing algorithm in their docs.
  // Common approach: HMAC-SHA256 of rawBody with webhook secret.
  const encoder = new TextEncoder()
  const key = encoder.encode(webhookSecret)
  const imported = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sigBuf = await crypto.subtle.sign('HMAC', imported, encoder.encode(rawBody))
  const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2,'0')).join('')
  if (computed !== signatureHeader && computed.toLowerCase() !== (signatureHeader || '').toLowerCase()) {
    throw new Error('signature_mismatch')
  }
}

export async function handleLemonEvent(env: any, event: any) {
  // Store provider_event and basic processing similar to Stripe
  const db = env.DB
  if (!db) throw new Error('D1 binding (DB) not configured')
  const provider = 'lemonsqueezy'
  const eventId = event.id || (event.event ? event.event.id : null) || JSON.stringify(event).slice(0, 64)

  const exists = await db.prepare('SELECT 1 FROM provider_events WHERE provider = ? AND event_id = ?').bind(provider, eventId).first()
  if (exists) return

  await db.prepare('INSERT INTO provider_events (provider, event_id, payload, received_at) VALUES (?, ?, ?, ?)').bind(provider, eventId, JSON.stringify(event), Date.now()).run()

  // TODO: map lemon events to subscriptions/invoices: e.g., event.name === 'order:created' or 'subscription:created'
  // Implement exact mappings per LemonSqueezy event payload structure and update subscriptions/invoices tables.
  console.log('Received LemonSqueezy event', eventId)
}