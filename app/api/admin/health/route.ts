import { NextResponse } from "next/server"
import { checkDatabaseHealth } from "@/lib/db"

export async function GET() {
  try {
    // Always return a response, never throw
    const health = await checkDatabaseHealth()

    return NextResponse.json(health, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Health check endpoint error:", error)

    // Always return a valid response with fallback information
    const fallbackResponse = {
      healthy: false,
      message: "Health check system error. Running in demo mode.",
      details: error instanceof Error ? error.message : "Unknown system error",
      suggestion: "The health check system encountered an error. Demo mode is still available.",
    }

    return NextResponse.json(fallbackResponse, {
      status: 200, // Return 200 so the frontend doesn't treat it as a network error
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
}
