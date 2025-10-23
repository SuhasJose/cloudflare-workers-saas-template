import { NextResponse } from 'next/server'
import { verifyStripeSignature, handleStripeEvent } from '../../../../lib/webhooks/stripe'

export async function POST(request: Request, { env }: { env: any }) {
  const raw = await request.text()
  const sig = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature')
  const secret = env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'stripe webhook secret not configured' }, { status: 400 })
  }

  let event: any
  try {
    // verifyStripeSignature throws if invalid
    event = await verifyStripeSignature(raw, sig, secret)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err?.message)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  try {
    // idempotent handler: handleStripeEvent will record provider_event and ignore duplicates
    await handleStripeEvent(env, event)
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Stripe webhook handling failed:', err)
    return NextResponse.json({ error: 'handler_error', message: String(err) }, { status: 500 })
  }
}