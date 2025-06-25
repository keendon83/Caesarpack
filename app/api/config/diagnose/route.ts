import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const { databaseUrl } = await request.json()

    if (!databaseUrl) {
      return NextResponse.json({ success: false, message: "Database URL is required" }, { status: 400 })
    }

    const sql = neon(databaseUrl)
    const result = await Promise.race([
      sql`SELECT version() as postgres_version`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 10000)),
    ])

    return NextResponse.json({
      success: true,
      message: "Database connection successful!",
      version: result[0]?.postgres_version || "Unknown",
    })
  } catch (error) {
    console.error("Database diagnostic failed:", error)

    let message = "Connection failed"
    let suggestion = "Please double-check your entire connection string."
    const details = error instanceof Error ? error.message : "Unknown error"

    if (details.includes("timeout")) {
      message = "Connection Timeout"
      suggestion =
        "Your database didn't respond in time. Check if the host is correct and if your database is active. Also, try using the non-pooled connection string from your Neon dashboard."
    } else if (details.includes("authentication failed")) {
      message = "Authentication Failed"
      suggestion =
        "The username or password in your connection string is incorrect. Please verify your credentials in the Neon dashboard."
    } else if (details.includes("database") && details.includes("does not exist")) {
      message = "Database Not Found"
      suggestion = "The database name in your connection string is incorrect. Please verify it in the Neon dashboard."
    } else if (details.includes("ENOTFOUND") || details.includes("EAI_AGAIN")) {
      message = "Host Not Found"
      suggestion = "The database host address could not be found. Please check for typos in the host part of the URL."
    }

    return NextResponse.json(
      {
        success: false,
        message,
        details,
        suggestion,
      },
      { status: 400 },
    )
  }
}
