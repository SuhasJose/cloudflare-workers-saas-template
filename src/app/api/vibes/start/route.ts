// Next.js App Router API route (edge runtime compatible) to start a generation.
// NOTE: When deployed using OpenNext / Cloudflare Workers, the env parameter is provided by the platform.
// Signature includes context with env - OpenNext will forward bindings to the route handler.
export async function POST(request: Request, { env }: { env: any }) {
  const body = await request.json().catch(() => ({}))
  const prompt = body.prompt || ''
  const teamId = body.teamId || `team:${crypto.randomUUID()}`

  try {
    const result = await import('../../../../vibes/index').then(mod => mod.startGeneration(env, { prompt, teamId }))
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}