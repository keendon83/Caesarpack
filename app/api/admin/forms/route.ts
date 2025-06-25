import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getAllForms } from "@/lib/forms"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const forms = await getAllForms()

    return NextResponse.json({ forms })
  } catch (error) {
    console.error("Get admin forms error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
