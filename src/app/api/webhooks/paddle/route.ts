import { NextResponse } from 'next/server'
import { handlePaddleEvent } from '../../../../lib/webhooks/paddle'

export async function POST(request: Request, { env }: { env: any }) {
  // Paddle signatures are sent as a p_signature form field (base64 of RSA signature).
  // Paddle uses public-key signature verification (requires Paddle public key).
  // For now we accept the body and delegate verification to handlePaddleEvent helper.
  const raw = await request.text()
  let event
  try {
    // Paddle sends form-encoded body: parse into an object
    const params = Object.fromEntries(new URLSearchParams(raw))
    event = params
  } catch (err) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  try {
    await handlePaddleEvent(env, event)
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Paddle webhook handler error:', err)
    return NextResponse.json({ error: 'handler_error' }, { status: 500 })
  }
}