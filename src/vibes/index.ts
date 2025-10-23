// Client wrapper to talk to the CodeGen Durable Object.
// Usage (within a Cloudflare Worker/OpenNext environment):
// const res = await startGeneration(env, { prompt: "build a todo app", teamId: "team:123" })
export async function startGeneration(env: any, opts: { prompt: string; teamId?: string }) {
  if (!env?.CODEGEN_DO) throw new Error('CODEGEN_DO binding not configured in env')

  const name = opts.teamId ?? `team:${crypto.randomUUID()}`
  // Get durable object id and stub for that team
  const id = env.CODEGEN_DO.idFromName(name)
  const stub = env.CODEGEN_DO.get(id)

  const res = await stub.fetch(new Request(`https://codegen.example/start`, {
    method: 'POST',
    body: JSON.stringify({ prompt: opts.prompt, teamId: name }),
    headers: { 'Content-Type': 'application/json' },
  }))

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to start generation: ${text}`)
  }
  return res.json()
}

export async function getJobStatus(env: any, jobId: string, teamId?: string) {
  if (!env?.CODEGEN_DO) throw new Error('CODEGEN_DO binding not configured in env')
  const name = teamId ?? 'default'
  const id = env.CODEGEN_DO.idFromName(name)
  const stub = env.CODEGEN_DO.get(id)
  const res = await stub.fetch(`https://codegen.example/status?id=${encodeURIComponent(jobId)}`)
  if (!res.ok) throw new Error('status fetch failed')
  return res.json()
}