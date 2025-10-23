const STRIPE_API = 'https://api.stripe.com/v1'
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY

export async function createStripeCheckout(planId: string, teamId: string, returnUrl: string) {
  if (!STRIPE_SECRET) {
    // Return a demo url for local/dev to avoid hard failure
    console.warn('STRIPE_SECRET_KEY not configured; returning demo checkout url')
    return { url: `https://example.com/demo-checkout?provider=stripe&plan=${planId}` }
  }

  const params = new URLSearchParams()
  params.append('mode', 'subscription')
  params.append('line_items[0][price]', planId)
  params.append('success_url', returnUrl)
  params.append('cancel_url', `${returnUrl}?canceled=1`)
  params.append('metadata[teamId]', teamId)

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error('Stripe error: ' + txt)
  }
  const data = await res.json()
  return { url: data.url, id: data.id }
}