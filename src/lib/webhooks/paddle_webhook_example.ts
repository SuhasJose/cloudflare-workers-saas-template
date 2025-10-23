/**
 * Example Paddle webhook endpoint implementation
 * 
 * This file demonstrates how to use the verifyPaddleSignature function
 * in a Next.js API route to handle Paddle webhooks securely.
 * 
 * To use this in production:
 * 1. Copy this file to src/app/api/webhooks/paddle/route.ts
 * 2. Set PADDLE_WEBHOOK_SECRET in your environment variables
 * 3. Configure this URL in your Paddle dashboard as the webhook endpoint
 */

import { verifyPaddleSignature } from "@/lib/webhooks/paddle_verify";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the Paddle-Signature header
    const signature = request.headers.get("Paddle-Signature");
    
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }
    
    // Get the raw request body
    const body = await request.text();
    
    // Extract timestamp from the signature header
    const tsMatch = signature.match(/ts=(\d+)/);
    const timestamp = tsMatch?.[1] || "";
    
    // Get webhook secret from environment
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error("PADDLE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    // Verify the signature
    const isValid = verifyPaddleSignature({
      signature,
      body,
      timestamp,
      secret,
    });
    
    if (!isValid) {
      console.warn("Invalid Paddle webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
    
    // Parse the webhook event
    const event = JSON.parse(body);
    
    // Handle different event types
    switch (event.event_type) {
      case "subscription.created":
        // Handle subscription creation
        console.log("New subscription:", event.data);
        break;
        
      case "subscription.updated":
        // Handle subscription update
        console.log("Subscription updated:", event.data);
        break;
        
      case "subscription.canceled":
        // Handle subscription cancellation
        console.log("Subscription canceled:", event.data);
        break;
        
      case "transaction.completed":
        // Handle completed transaction
        console.log("Transaction completed:", event.data);
        break;
        
      default:
        console.log("Unhandled event type:", event.event_type);
    }
    
    // Return success
    return NextResponse.json({ received: true }, { status: 200 });
    
  } catch (error) {
    console.error("Error processing Paddle webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
