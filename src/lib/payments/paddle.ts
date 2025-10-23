const PADDLE_VENDOR_ID = process.env.PADDLE_VENDOR_ID
const PADDLE_API_KEY = process.env.PADDLE_API_KEY

export async function createPaddleCheckout(planId: string, teamId: string, returnUrl: string) {
  if (!PADDLE_API_KEY || !PADDLE_VENDOR_ID) {
    console.warn('Paddle credentials not configured; returning demo url')
    return `https://example.com/demo-checkout?provider=paddle&plan=${planId}`
  }

  const params = new URLSearchParams()
  params.append('vendor_id', PADDLE_VENDOR_ID)
  params.append('vendor_auth_code', PADDLE_API_KEY)
  params.append('product_id', planId)
  params.append('return_url', returnUrl)
  params.append('passthrough', JSON.stringify({ teamId }))

  const res = await fetch('https://vendors.paddle.com/api/2.0/product/generate_pay_link', {
    method: 'POST',
    body: params,
  })

  const json = await res.json()
  if (!json.success) throw new Error('Paddle error: ' + JSON.stringify(json))
  return json.response.url
}