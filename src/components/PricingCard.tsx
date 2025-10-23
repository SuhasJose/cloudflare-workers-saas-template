export default function PricingCard({ plan, onSubscribe }: { plan: { id: string; name: string; price: string; interval: string; description: string }, onSubscribe: () => void }) {
  return (
    <div className="bg-glass p-6 rounded-2xl text-center">
      <h3 className="text-2xl font-bold">{plan.name}</h3>
      <p className="text-4xl font-extrabold mt-4">{plan.price}<span className="text-lg font-medium">/{plan.interval}</span></p>
      <p className="mt-4 text-muted">{plan.description}</p>
      <button onClick={onSubscribe} className="mt-6 px-5 py-3 rounded-lg bg-gradient-to-r from-[#7C4DFF] to-[#00E5FF] text-white font-semibold">Subscribe</button>
    </div>
  )
}