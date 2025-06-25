import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getRejectionAmountsByDepartment } from "@/lib/departments"

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

    const amounts = await getRejectionAmountsByDepartment(user.user_id)

    return NextResponse.json({ amounts })
  } catch (error) {
    console.error("Get rejection amounts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
