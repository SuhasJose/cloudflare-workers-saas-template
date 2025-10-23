import { NextResponse } from 'next/server'
import { handleLemonEvent, verifyLemonSignature } from '../../../../lib/webhooks/lemonsqueezy'

export async function POST(request: Request, { env }: { env: any }) {
  const raw = await request.text()
  const sig = request.headers.get('x-hook-signature') || request.headers.get('X-Hook-Signature')
  const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET || process.env.LEMONSQUEEZY_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'lemonsqueezy webhook secret not configured' }, { status: 400 })
  }

  try {
    // verifyLemonSignature should compute HMAC-SHA256(raw, secret) and compare to sig
    await verifyLemonSignature(raw, sig, secret)
  } catch (err: any) {
    console.error('LemonSqueezy signature verification failed:', err?.message)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  let event
  try {
    event = JSON.parse(raw)
  } catch (err) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  try {
    await handleLemonEvent(env, event)
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('LemonSqueezy webhook handler error:', err)
    return NextResponse.json({ error: 'handler_error' }, { status: 500 })
  }
}