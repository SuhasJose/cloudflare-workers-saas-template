import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Parameters for verifying Paddle webhook signatures
 */
export interface VerifyPaddleSignatureParams {
  /**
   * The signature header from the Paddle webhook (Paddle-Signature)
   */
  signature: string;
  /**
   * The raw request body as a string
   */
  body: string;
  /**
   * The timestamp from the signature header (ts parameter)
   */
  timestamp: string;
  /**
   * The Paddle webhook secret key
   */
  secret: string;
}

/**
 * Verifies the signature of a Paddle webhook request.
 * 
 * Paddle signs webhook requests using HMAC-SHA256 with your webhook secret.
 * The signature is sent in the Paddle-Signature header in the format:
 * ts=<timestamp>;h1=<signature>
 * 
 * To verify:
 * 1. Extract timestamp and signature from the header
 * 2. Construct the signed payload: timestamp + ":" + request_body
 * 3. Compute HMAC-SHA256 hash using the webhook secret
 * 4. Compare the computed hash with the signature using timing-safe comparison
 * 
 * @param params - The verification parameters
 * @returns true if the signature is valid, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = verifyPaddleSignature({
 *   signature: "ts=1234567890;h1=abc123...",
 *   body: '{"event_type":"subscription.created",...}',
 *   timestamp: "1234567890",
 *   secret: "your_paddle_webhook_secret"
 * });
 * ```
 */
export function verifyPaddleSignature(
  params: Record<string, string>
): boolean {
  try {
    const { signature, body, timestamp, secret } = params as VerifyPaddleSignatureParams;

    // Validate required parameters
    if (!signature || !body || !timestamp || !secret) {
      return false;
    }

    // Extract the signature hash from the header
    // Format: ts=<timestamp>;h1=<signature>
    const signatureParts = signature.split(";");
    let signatureHash = "";

    for (const part of signatureParts) {
      if (part.startsWith("h1=")) {
        signatureHash = part.substring(3);
        break;
      }
    }

    if (!signatureHash) {
      return false;
    }

    // Construct the signed payload: timestamp:body
    const signedPayload = `${timestamp}:${body}`;

    // Compute HMAC-SHA256 hash
    const computedHash = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signatureHash);
    const computedBuffer = Buffer.from(computedHash);

    // Ensure buffers are same length for timing-safe comparison
    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, computedBuffer);
  } catch {
    // Return false for any errors (invalid input, crypto errors, etc.)
    return false;
  }
}
