# Webhook Verification Utilities

This directory contains utilities for verifying webhook signatures from various payment and service providers.

## Paddle Webhook Verification

### Overview

The `paddle_verify.ts` module provides signature verification for Paddle webhooks using HMAC-SHA256.

### Usage

```typescript
import { verifyPaddleSignature } from "@/lib/webhooks/paddle_verify";

// In your webhook API route
export async function POST(request: Request) {
  // Get the Paddle-Signature header
  const signature = request.headers.get("Paddle-Signature");
  
  // Get the raw request body
  const body = await request.text();
  
  // Extract timestamp from the signature header (ts parameter)
  const tsMatch = signature?.match(/ts=(\d+)/);
  const timestamp = tsMatch?.[1] || "";
  
  // Get your webhook secret from environment variables
  const secret = process.env.PADDLE_WEBHOOK_SECRET || "";
  
  // Verify the signature
  const isValid = verifyPaddleSignature({
    signature,
    body,
    timestamp,
    secret,
  });
  
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }
  
  // Process the webhook...
  const event = JSON.parse(body);
  // Handle event
  
  return new Response("OK", { status: 200 });
}
```

### How it Works

Paddle signs webhook requests using HMAC-SHA256 with your webhook secret. The signature is sent in the `Paddle-Signature` header in the format:

```
ts=<timestamp>;h1=<signature>
```

The verification process:

1. Extracts timestamp and signature from the header
2. Constructs the signed payload: `timestamp + ":" + request_body`
3. Computes HMAC-SHA256 hash using the webhook secret
4. Compares the computed hash with the signature using timing-safe comparison

### Testing

Run the test suite to verify the implementation:

```bash
npx tsx src/lib/webhooks/paddle_verify.test.ts
```

The test suite includes:
- Valid signature verification
- Invalid signature detection (wrong secret, tampered body, wrong timestamp)
- Edge cases (missing parameters, malformed signatures)

### Security Considerations

- Always use the raw request body (don't parse it first)
- Store webhook secrets in environment variables
- Use timing-safe comparison to prevent timing attacks
- Validate the timestamp to prevent replay attacks (implement your own timestamp validation based on your requirements)

### Configuration

Set the following environment variable:

```env
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret_here
```
