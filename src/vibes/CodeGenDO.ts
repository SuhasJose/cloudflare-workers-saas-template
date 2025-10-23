// Durable Object: CodeGenDO
// Purpose: keep generation job state, enqueue jobs, process jobs (alarm), and stream updates.
// TODO: wire this into the Vibe SDK internals (import Vibe SDK and call generation functions).
export default class CodeGenDO {
  state: DurableObjectState
  env: any

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env
  }

  // Helper to read stored job
  private async getJob(id: string) {
    return (await this.state.storage.get(`job:${id}`)) as any
  }

  // Helper to update job
  private async putJob(id: string, job: any) {
    await this.state.storage.put(`job:${id}`, job)
  }

  // POST /start -> create a job and schedule an alarm to process
  // GET  /status?id=jobId -> read job status
  async fetch(request: Request) {
    const url = new URL(request.url)
    const pathname = url.pathname.replace(/\/+/g, '')

    if (request.method === 'POST' && pathname.endsWith('/start')) {
      const body = await request.json().catch(() => ({}))
      const prompt = body.prompt || ''
      const teamId = body.teamId || 'anon'
      const jobId = crypto.randomUUID()
      const job = {
        id: jobId,
        prompt,
        teamId,
        status: 'queued',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        progress: 0,
        result: null,
      }
      await this.putJob(jobId, job)

      // schedule an immediate alarm to start processing
      // alarm fires after 1 second by default if not provided; use setAlarm if needed.
      await this.state.blockConcurrencyWhile(async () => {
        // Use Durable Object Alarm to process job soon
        // timer: set an alarm 1 second from now
        await this.state.storage.put('__lastWake', Date.now())
      })
      // Use this.alarm to poll storage and process jobs (Cloudflare will call alarm via scheduler if set)
      return new Response(JSON.stringify({ jobId }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (request.method === 'GET' && pathname.endsWith('/status')) {
      const jobId = url.searchParams.get('id')
      if (!jobId) return new Response(JSON.stringify({ error: 'missing id' }), { status: 400 })
      const job = await this.getJob(jobId)
      if (!job) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
      return new Response(JSON.stringify(job), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Optional: stream endpoint for server-sent events (SSE) to push generation progress
    if (request.method === 'GET' && pathname.endsWith('/stream')) {
      // Expect query: ?id=jobId
      const jobId = url.searchParams.get('id')
      if (!jobId) return new Response('missing id', { status: 400 })

      // SSE basic implementation
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      // Send initial comment to establish SSE connection
      writer.write(encodeSSE({ event: 'connected', data: JSON.stringify({ jobId }) }))

      // Very simple poller: check storage every second for updates and push them.
      // In production, wire Vibe SDK callbacks so you stream real-time chunks.
      let closed = false
      const poll = async () => {
        while (!closed) {
          const job = await this.getJob(jobId)
          if (job) {
            writer.write(encodeSSE({ event: 'update', data: JSON.stringify({ progress: job.progress, status: job.status }) }))
            if (job.status === 'done' || job.status === 'failed') break
          }
          await new Promise((r) => setTimeout(r, 1000))
        }
        writer.close()
      }
      poll().catch(() => writer.close())

      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    return new Response('Not found', { status: 404 })
  }

  // Alarm handler: process queued jobs (very small worker emulation).
  // Note: Cloudflare Durable Objects support alarm() lifecycle method.
  async alarm() {
    // Find a queued job and process it.
    // This is a simple loop: find first queued job (in storage) and process.
    // For demo, pick one job, mark in-progress, simulate work, persist results.
    const list = await this.state.storage.list({ prefix: 'job:' })
    for await (const { key, value } of list) {
      const job = value as any
      if (job && job.status === 'queued') {
        job.status = 'in_progress'
        job.updatedAt = Date.now()
        await this.state.storage.put(key, job)

        // Simulate streaming chunks and progress updates; in real integration, call Vibe SDK here.
        for (let p = 10; p <= 100; p += 10) {
          job.progress = p
          job.updatedAt = Date.now()
          await this.state.storage.put(key, job)
          // small delay
          await new Promise((r) => setTimeout(r, 500))
        }

        // Finalize job
        job.status = 'done'
        job.result = { message: 'Generated artifact placeholder (wire Vibe SDK here)' }
        job.updatedAt = Date.now()
        await this.state.storage.put(key, job)
        // Only process one job per alarm to avoid long-running alarms
        break
      }
    }
  }
}

// Helpers
function encodeSSE({ event, data }: { event?: string; data: string }) {
  const ev = event ? `event: ${event}\n` : ''
  return new TextEncoder().encode(`${ev}data: ${data}\n\n`)
