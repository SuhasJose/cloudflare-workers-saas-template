const LEMON_API = 'https://api.lemonsqueezy.com/v1'
const LEMON_SECRET = process.env.LEMONSQUEEZY_API_KEY

export async function createLemonSqueezyCheckout(productId: string, teamId: string, returnUrl: string) {
  if (!LEMON_SECRET) {
    console.warn('LEMONSQUEEZY_API_KEY not configured; returning demo url')
    return `https://example.com/demo-checkout?provider=lemonsqueezy&plan=${productId}`
  }

  const res = await fetch(`${LEMON_API}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LEMON_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkout: {
        product_id: productId,
        redirect_url: returnUrl,
        metadata: { teamId },
      }
    })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error('LemonSqueezy error: ' + txt)
  }
  const data = await res.json()
  return data?.checkout?.url || ''
}