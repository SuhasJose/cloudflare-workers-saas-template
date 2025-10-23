export async function POST(request: Request, { env }: { env: any }) {
  try {
    const body = await request.json()
    const provider = body.provider
    const planId = body.planId
    const returnUrl = body.returnUrl || `${process.env.BASE_URL || 'https://makeappsnow.com'}/billing/complete`

    if (!provider || !planId) return new Response(JSON.stringify({ error: 'missing provider or planId' }), { status: 400 })

    if (provider === 'stripe') {
      const { createStripeCheckout } = await import('../../../../lib/payments/stripe')
      const session = await createStripeCheckout(planId, body.teamId || '', returnUrl)
      return new Response(JSON.stringify(session), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (provider === 'lemonsqueezy') {
      const { createLemonSqueezyCheckout } = await import('../../../../lib/payments/lemonsqueezy')
      const url = await createLemonSqueezyCheckout(planId, body.teamId || '', returnUrl)
      return new Response(JSON.stringify({ url }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (provider === 'paddle') {
      const { createPaddleCheckout } = await import('../../../../lib/payments/paddle')
      const url = await createPaddleCheckout(planId, body.teamId || '', returnUrl)
      return new Response(JSON.stringify({ url }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'unsupported provider' }), { status: 400 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'checkout_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}