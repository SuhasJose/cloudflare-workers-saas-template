import PricingCard from '../../components/PricingCard'
import { useState } from 'react'
import useCheckout from '../../lib/useCheckout'

export default function PricingPage() {
  const [provider, setProvider] = useState<'stripe'|'lemonsqueezy'|'paddle'>('stripe')
  const { startCheckout, loading } = useCheckout()

  const plans = [
    { id: 'price_basic', name: 'Starter', price: '$9', interval: 'mo', description: 'Basic features for small teams' },
    { id: 'price_pro', name: 'Pro', price: '$29', interval: 'mo', description: 'Advanced features and quotas' },
    { id: 'price_enterprise', name: 'Enterprise', price: '$99', interval: 'mo', description: 'Custom enterprise plan' },
  ]

  return (
    <div className="container mx-auto px-6 py-12">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold">Pricing</h1>
        <p className="mt-3 text-muted">Pick a plan and checkout with your preferred provider.</p>
      </header>

      <div className="flex justify-center gap-6 mb-6">
        <label className={`px-4 py-2 rounded-lg ${provider==='stripe'? 'bg-gradient-to-r from-fuchsia to-cyan text-white' : 'bg-white/5'}`}>  
          <input type="radio" name="provider" value="stripe" checked={provider==='stripe'} onChange={() => setProvider('stripe')} className="mr-2"/> Stripe
        </label>
        <label className={`px-4 py-2 rounded-lg ${provider==='lemonsqueezy'? 'bg-gradient-to-r from-fuchsia to-cyan text-white' : 'bg-white/5'}`}>  
          <input type="radio" name="provider" value="lemonsqueezy" checked={provider==='lemonsqueezy'} onChange={() => setProvider('lemonsqueezy')} className="mr-2"/> LemonSqueezy
        </label>
        <label className={`px-4 py-2 rounded-lg ${provider==='paddle'? 'bg-gradient-to-r from-fuchsia to-cyan text-white' : 'bg-white/5'}`}>  
          <input type="radio" name="provider" value="paddle" checked={provider==='paddle'} onChange={() => setProvider('paddle')} className="mr-2"/> Paddle
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <PricingCard key={p.id} plan={p} onSubscribe={async () => {
            try {
              await startCheckout({ provider, planId: p.id })
            } catch (err) {
              console.error(err)
              alert('Checkout failed: ' + (err instanceof Error ? err.message : String(err)))
            }
          }} />
        ))}
      </div>

      <footer className="mt-12 text-center text-muted">Payments powered by Stripe, LemonSqueezy and Paddle. No card data is collected on this site.</footer>
    </div>
  )
}