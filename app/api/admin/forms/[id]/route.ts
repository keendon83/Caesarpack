import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteForm } from "@/lib/forms"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const formId = Number.parseInt(params.id)
    const success = await deleteForm(formId)

    if (!success) {
      return NextResponse.json({ error: "Failed to delete form" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
