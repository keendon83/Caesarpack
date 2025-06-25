import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createForm } from "@/lib/forms"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { title, formData, workflowUsers, departmentAmounts } = await request.json()

    if (!title || !formData || !workflowUsers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const formId = await createForm(title, formData, user.user_id, workflowUsers)

    // Insert department amounts if provided
    if (departmentAmounts && departmentAmounts.length > 0) {
      for (const dept of departmentAmounts) {
        await sql`
          INSERT INTO form_departments (form_id, department_id, rejection_amount)
          VALUES (${formId}, ${dept.departmentId}, ${dept.rejectionAmount})
        `
      }
    }

    return NextResponse.json({ success: true, formId })
  } catch (error) {
    console.error("Create form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
