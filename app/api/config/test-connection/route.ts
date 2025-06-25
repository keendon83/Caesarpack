import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { databaseUrl } = await request.json()

    if (!databaseUrl) {
      return NextResponse.json({ error: "Database URL is required" }, { status: 400 })
    }

    // Test the connection
    const sql = neon(databaseUrl)

    // Try a simple query with timeout
    const result = await Promise.race([
      sql`SELECT 1 as test, version() as postgres_version`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 10000)),
    ])

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      version: result[0]?.postgres_version || "Unknown",
    })
  } catch (error) {
    console.error("Database connection test failed:", error)

    let errorMessage = "Connection failed"
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Connection timeout - check your database URL and network"
      } else if (error.message.includes("authentication")) {
        errorMessage = "Authentication failed - check your username and password"
      } else if (error.message.includes("does not exist")) {
        errorMessage = "Database does not exist - check your database name"
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    )
  }
}
