import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { signFormStep } from "@/lib/forms"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { updatedFields, comments } = await request.json()

    // Update form data if fields were modified
    if (updatedFields) {
      await sql`
        UPDATE forms 
        SET form_data = ${JSON.stringify(updatedFields)}, 
            updated_at = CURRENT_TIMESTAMP
        WHERE form_id = ${formId}
      `
    }

    // Sign the form step
    const success = await signFormStep(formId, user.user_id, { comments, updatedFields })

    if (!success) {
      return NextResponse.json({ error: "Failed to approve form" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Approve form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
