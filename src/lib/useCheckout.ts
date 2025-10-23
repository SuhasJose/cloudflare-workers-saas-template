import { useState } from 'react'

export default function useCheckout() {
  const [loading, setLoading] = useState(false)

  async function startCheckout(opts: { provider: string; planId: string; teamId?: string }) {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt)
      }
      const data = await res.json()
      // adapt to providers' different return shapes
      if (data.url) {
        window.location.href = data.url
      } else if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('no checkout url returned')
      }
    } finally {
      setLoading(false)
    }
  }

  return { startCheckout, loading }
}