/**
 * Manual test/validation script for Paddle webhook signature verification
 * 
 * This script demonstrates and validates the verifyPaddleSignature function
 * Run with: node src/lib/webhooks/paddle_verify.test.js (after compiling)
 * Or directly: node --eval "$(cat src/lib/webhooks/paddle_verify.test.ts)"
 */

import { createHmac, timingSafeEqual } from "node:crypto";

// Inline the verifyPaddleSignature function for testing
function verifyPaddleSignature(params: Record<string, string>): boolean {
  try {
    const { signature, body, timestamp, secret } = params;

    if (!signature || !body || !timestamp || !secret) {
      return false;
    }

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

    const signedPayload = `${timestamp}:${body}`;
    const computedHash = createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    const signatureBuffer = Buffer.from(signatureHash);
    const computedBuffer = Buffer.from(computedHash);

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, computedBuffer);
  } catch {
    return false;
  }
}

// Test data
const webhookSecret = "test_secret_key_12345";
const timestamp = "1234567890";
const requestBody = JSON.stringify({
  event_type: "subscription.created",
  data: {
    subscription_id: "sub_123",
    customer_id: "cus_456",
  },
});

// Helper function to create a valid signature
function createValidSignature(timestamp: string, body: string, secret: string): string {
  const signedPayload = `${timestamp}:${body}`;
  const hash = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `ts=${timestamp};h1=${hash}`;
}

// Test cases
console.log("=== Paddle Webhook Signature Verification Tests ===\n");

// Test 1: Valid signature
console.log("Test 1: Valid signature");
const validSignature = createValidSignature(timestamp, requestBody, webhookSecret);
const test1Result = verifyPaddleSignature({
  signature: validSignature,
  body: requestBody,
  timestamp,
  secret: webhookSecret,
});
console.log(`Expected: true, Got: ${test1Result}`);
console.log(`Status: ${test1Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 2: Invalid signature (wrong secret)
console.log("Test 2: Invalid signature (wrong secret)");
const test2Result = verifyPaddleSignature({
  signature: validSignature,
  body: requestBody,
  timestamp,
  secret: "wrong_secret",
});
console.log(`Expected: false, Got: ${test2Result}`);
console.log(`Status: ${!test2Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 3: Invalid signature (tampered body)
console.log("Test 3: Invalid signature (tampered body)");
const tamperedBody = requestBody.replace("sub_123", "sub_999");
const test3Result = verifyPaddleSignature({
  signature: validSignature,
  body: tamperedBody,
  timestamp,
  secret: webhookSecret,
});
console.log(`Expected: false, Got: ${test3Result}`);
console.log(`Status: ${!test3Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 4: Invalid signature (wrong timestamp)
console.log("Test 4: Invalid signature (wrong timestamp)");
const test4Result = verifyPaddleSignature({
  signature: validSignature,
  body: requestBody,
  timestamp: "9999999999",
  secret: webhookSecret,
});
console.log(`Expected: false, Got: ${test4Result}`);
console.log(`Status: ${!test4Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 5: Missing signature
console.log("Test 5: Missing signature");
const test5Result = verifyPaddleSignature({
  signature: "",
  body: requestBody,
  timestamp,
  secret: webhookSecret,
});
console.log(`Expected: false, Got: ${test5Result}`);
console.log(`Status: ${!test5Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 6: Missing body
console.log("Test 6: Missing body");
const test6Result = verifyPaddleSignature({
  signature: validSignature,
  body: "",
  timestamp,
  secret: webhookSecret,
});
console.log(`Expected: false, Got: ${test6Result}`);
console.log(`Status: ${!test6Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 7: Missing timestamp
console.log("Test 7: Missing timestamp");
const test7Result = verifyPaddleSignature({
  signature: validSignature,
  body: requestBody,
  timestamp: "",
  secret: webhookSecret,
});
console.log(`Expected: false, Got: ${test7Result}`);
console.log(`Status: ${!test7Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 8: Missing secret
console.log("Test 8: Missing secret");
const test8Result = verifyPaddleSignature({
  signature: validSignature,
  body: requestBody,
  timestamp,
  secret: "",
});
console.log(`Expected: false, Got: ${test8Result}`);
console.log(`Status: ${!test8Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 9: Malformed signature (no h1 part)
console.log("Test 9: Malformed signature (no h1 part)");
const test9Result = verifyPaddleSignature({
  signature: `ts=${timestamp}`,
  body: requestBody,
  timestamp,
  secret: webhookSecret,
});
console.log(`Expected: false, Got: ${test9Result}`);
console.log(`Status: ${!test9Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Test 10: Different valid signature format
console.log("Test 10: Different timestamp with valid signature");
const newTimestamp = "9876543210";
const newSignature = createValidSignature(newTimestamp, requestBody, webhookSecret);
const test10Result = verifyPaddleSignature({
  signature: newSignature,
  body: requestBody,
  timestamp: newTimestamp,
  secret: webhookSecret,
});
console.log(`Expected: true, Got: ${test10Result}`);
console.log(`Status: ${test10Result ? "✓ PASS" : "✗ FAIL"}\n`);

// Summary
const allTests = [test1Result, !test2Result, !test3Result, !test4Result, !test5Result, !test6Result, !test7Result, !test8Result, !test9Result, test10Result];
const passedTests = allTests.filter(Boolean).length;
console.log("=== Test Summary ===");
console.log(`Passed: ${passedTests}/${allTests.length}`);
console.log(`Status: ${passedTests === allTests.length ? "✓ ALL TESTS PASSED" : "✗ SOME TESTS FAILED"}`);
