import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFormWorkflow } from "@/lib/forms"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const formId = Number.parseInt(params.id)
    const workflow = await getFormWorkflow(formId)

    return NextResponse.json({ workflow })
  } catch (error) {
    console.error("Get form workflow error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
