import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFormsCreatedByUser } from "@/lib/forms"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const forms = await getFormsCreatedByUser(user.user_id)

    return NextResponse.json({ forms })
  } catch (error) {
    console.error("Get user forms error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
