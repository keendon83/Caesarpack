import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getAllDepartments } from "@/lib/departments"

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

    const departments = await getAllDepartments()

    return NextResponse.json({ departments })
  } catch (error) {
    console.error("Get departments error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
