````markdown
name=src/vibes/README.md
```markdown
# Vibe CodeGen Durable Object (scaffold)

What this does
- Provides a Durable Object (CodeGenDO) that stores generation jobs and processes them.
- The DO exposes these endpoints: POST /start, GET /status?id=jobId, GET /stream?id=jobId (SSE).
- The DO currently contains a simulated processing loop. Replace the simulated work with Vibe SDK calls.

Where to put it
- Place these files under src/vibes in the monorepo.
- The Durable Object class (CodeGenDO.ts) must be registered in wrangler.toml as a durable object binding.

Wrangler / binding example
Add to your wrangler.toml:
```toml
[durable_objects]
bindings = [
  { name = "CODEGEN_DO", class_name = "CodeGenDO" }
]
```

How the flow works
1. Frontend calls your API route (e.g., /api/vibes/start) to request a generation.
2. API route uses the wrapper (src/vibes/index.ts) with the env binding to obtain the DO stub and POST /start.
3. The DO stores job state and either processes it (alarm) or delegates to the Vibe SDK to generate artifacts.
4. Frontend can poll /api/vibes/status or connect to SSE /api/vibes/stream?id=<jobId> to receive progress.

Next steps
- Replace simulated processing in alarm() with real calls to cloudflare/vibesdk.
- Add authentication + team scoping (map team -> durable object name).
- Add persistent references to D1/R2 for storing artifacts and DB-level bookkeeping for billing/entitlements.
```
````