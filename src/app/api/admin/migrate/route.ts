import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { migrations } from "@/db/migrations/migrations";

/**
 * Secure admin API route for running database migrations
 * 
 * This endpoint executes the migration statements defined in migrations.ts
 * to create or update database tables. It's designed to be idempotent using
 * "IF NOT EXISTS" clauses in SQL statements.
 * 
 * Security:
 * - Requires x-migration-secret header matching MIGRATION_SECRET environment variable
 * - Returns 401 if secret is missing or mismatched
 * - Returns 500 if DB binding is not configured
 * 
 * Usage:
 * POST /api/admin/migrate
 * Headers:
 *   x-migration-secret: <your-secret>
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   results: Array<{ statement: string, success: boolean, error?: string }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    
    // Verify authentication via secret header
    const migrationSecret = request.headers.get("x-migration-secret");
    const expectedSecret = env.MIGRATION_SECRET || process.env.MIGRATION_SECRET;
    
    if (!expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Migration secret not configured on server",
        },
        { status: 500 }
      );
    }
    
    if (!migrationSecret || migrationSecret !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Invalid or missing migration secret",
        },
        { status: 401 }
      );
    }
    
    // Check if DB binding is configured
    if (!env.DB) {
      return NextResponse.json(
        {
          success: false,
          message: "Database binding (DB) not configured. Please add D1 binding named 'DB' to wrangler.toml",
        },
        { status: 500 }
      );
    }
    
    // Execute migrations
    const results: Array<{
      statement: string;
      success: boolean;
      error?: string;
    }> = [];
    
    let allSuccessful = true;
    
    for (const sql of migrations) {
      try {
        // Truncate statement for display (first 100 chars)
        const displayStatement = sql.length > 100 
          ? sql.substring(0, 100) + "..."
          : sql;
        
        await env.DB.prepare(sql).run();
        
        results.push({
          statement: displayStatement,
          success: true,
        });
      } catch (error) {
        allSuccessful = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        results.push({
          statement: sql.length > 100 ? sql.substring(0, 100) + "..." : sql,
          success: false,
          error: errorMessage,
        });
      }
    }
    
    return NextResponse.json(
      {
        success: allSuccessful,
        message: allSuccessful 
          ? `Successfully executed ${migrations.length} migration statements`
          : `Completed with errors. ${results.filter(r => r.success).length}/${migrations.length} statements succeeded`,
        results,
      },
      { status: allSuccessful ? 200 : 500 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Failed to execute migrations",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
