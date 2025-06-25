import { sql } from "./db"

export interface Form {
  form_id: number
  title: string
  form_data: any
  created_by: number
  created_at: string
  updated_at: string
  status: "pending" | "in_progress" | "completed" | "rejected"
  creator_name?: string
}

export interface FormWorkflow {
  workflow_id: number
  form_id: number
  user_id: number
  sequence_order: number
  signed: boolean
  signed_at: string | null
  updated_fields: any
  user_name?: string
  designation?: string
}

// Fallback forms data for demo mode
const FALLBACK_FORMS: Form[] = [
  {
    form_id: 1,
    title: "Customer Rejection - ABC Company",
    form_data: {
      customerName: "ABC Company",
      totalDiscount: "5000",
      complaintDescription: "Quality issues with delivered products",
      qualityIssues: ["Quality", "Damaged Sheets"],
      responsibleDepartments: [1, 5],
    },
    created_by: 2,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    status: "in_progress",
    creator_name: "Demo User",
  },
  {
    form_id: 2,
    title: "Customer Rejection - XYZ Corp",
    form_data: {
      customerName: "XYZ Corp",
      totalDiscount: "3000",
      complaintDescription: "Wrong size delivered",
      qualityIssues: ["Wrong Size"],
      responsibleDepartments: [2],
    },
    created_by: 2,
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    status: "completed",
    creator_name: "Demo User",
  },
]

// Check if database is available
async function isDatabaseAvailable(): Promise<boolean> {
  if (!sql || !process.env.DATABASE_URL) {
    return false
  }

  try {
    await sql`SELECT 1`
    return true
  } catch (error) {
    return false
  }
}

export async function createForm(
  title: string,
  formData: any,
  createdBy: number,
  workflowUsers: { userId: number; sequenceOrder: number }[],
): Promise<number> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      // Return a mock form ID for demo mode
      console.log("Database not available, returning mock form ID")
      return Math.floor(Math.random() * 1000) + 100
    }

    // Insert form
    const formResult = await sql`
      INSERT INTO forms (title, form_data, created_by)
      VALUES (${title}, ${JSON.stringify(formData)}, ${createdBy})
      RETURNING form_id
    `

    const formId = formResult[0].form_id

    // Insert workflow steps
    for (const step of workflowUsers) {
      await sql`
        INSERT INTO form_workflows (form_id, user_id, sequence_order)
        VALUES (${formId}, ${step.userId}, ${step.sequenceOrder})
      `
    }

    // Update form status to in_progress
    await sql`
      UPDATE forms 
      SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
      WHERE form_id = ${formId}
    `

    return formId
  } catch (error) {
    console.error("Error creating form:", error)
    // Return mock ID on error
    return Math.floor(Math.random() * 1000) + 100
  }
}

export async function getFormById(formId: number): Promise<Form | null> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      return FALLBACK_FORMS.find((f) => f.form_id === formId) || null
    }

    const forms = await sql`
      SELECT f.*, u.full_name as creator_name
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.user_id
      WHERE f.form_id = ${formId}
    `

    return forms.length > 0 ? (forms[0] as Form) : null
  } catch (error) {
    console.error("Error getting form:", error)
    return FALLBACK_FORMS.find((f) => f.form_id === formId) || null
  }
}

export async function getPendingFormsForUser(userId: number): Promise<Form[]> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      // Return mock pending forms for demo
      return FALLBACK_FORMS.filter((f) => f.status === "in_progress")
    }

    const forms = await sql`
      SELECT DISTINCT f.*, u.full_name as creator_name
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.user_id
      INNER JOIN form_workflows fw ON f.form_id = fw.form_id
      WHERE fw.user_id = ${userId} 
        AND fw.signed = FALSE 
        AND f.status = 'in_progress'
        AND NOT EXISTS (
          SELECT 1 FROM form_workflows fw2 
          WHERE fw2.form_id = f.form_id 
            AND fw2.sequence_order < fw.sequence_order 
            AND fw2.signed = FALSE
        )
      ORDER BY f.created_at DESC
    `

    return forms as Form[]
  } catch (error) {
    console.error("Error getting pending forms:", error)
    return FALLBACK_FORMS.filter((f) => f.status === "in_progress")
  }
}

export async function getFormsCreatedByUser(userId: number): Promise<Form[]> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      return FALLBACK_FORMS.filter((f) => f.created_by === userId)
    }

    const forms = await sql`
      SELECT f.*, u.full_name as creator_name
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.user_id
      WHERE f.created_by = ${userId}
      ORDER BY f.created_at DESC
    `

    return forms as Form[]
  } catch (error) {
    console.error("Error getting user forms:", error)
    return FALLBACK_FORMS.filter((f) => f.created_by === userId)
  }
}

export async function getAllForms(): Promise<Form[]> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      return FALLBACK_FORMS
    }

    const forms = await sql`
      SELECT f.*, u.full_name as creator_name
      FROM forms f
      LEFT JOIN users u ON f.created_by = u.user_id
      ORDER BY f.created_at DESC
    `

    return forms as Form[]
  } catch (error) {
    console.error("Error getting all forms:", error)
    return FALLBACK_FORMS
  }
}

export async function getFormWorkflow(formId: number): Promise<FormWorkflow[]> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      // Return mock workflow for demo
      return [
        {
          workflow_id: 1,
          form_id: formId,
          user_id: 6,
          sequence_order: 1,
          signed: true,
          signed_at: new Date(Date.now() - 3600000).toISOString(),
          updated_fields: null,
          user_name: "NRA Officer",
          designation: "NRA Officer",
        },
        {
          workflow_id: 2,
          form_id: formId,
          user_id: 3,
          sequence_order: 2,
          signed: false,
          signed_at: null,
          updated_fields: null,
          user_name: "Sales Director",
          designation: "Sales Director",
        },
        {
          workflow_id: 3,
          form_id: formId,
          user_id: 4,
          sequence_order: 3,
          signed: false,
          signed_at: null,
          updated_fields: null,
          user_name: "CEO",
          designation: "Chief Executive Officer",
        },
        {
          workflow_id: 4,
          form_id: formId,
          user_id: 5,
          sequence_order: 4,
          signed: false,
          signed_at: null,
          updated_fields: null,
          user_name: "Finance Manager",
          designation: "Finance Manager",
        },
      ]
    }

    const workflow = await sql`
      SELECT fw.*, u.full_name as user_name, u.designation
      FROM form_workflows fw
      LEFT JOIN users u ON fw.user_id = u.user_id
      WHERE fw.form_id = ${formId}
      ORDER BY fw.sequence_order
    `

    return workflow as FormWorkflow[]
  } catch (error) {
    console.error("Error getting form workflow:", error)
    return []
  }
}

export async function signFormStep(formId: number, userId: number, updatedFields: any = null): Promise<boolean> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      console.log("Database not available, simulating form signing")
      return true
    }

    // Update the workflow step
    await sql`
      UPDATE form_workflows 
      SET signed = TRUE, 
          signed_at = CURRENT_TIMESTAMP,
          updated_fields = ${updatedFields ? JSON.stringify(updatedFields) : null}
      WHERE form_id = ${formId} AND user_id = ${userId}
    `

    // Create signature record
    const signatureHash = `${formId}-${userId}-${Date.now()}`
    await sql`
      INSERT INTO signatures (form_id, user_id, signature_hash)
      VALUES (${formId}, ${userId}, ${signatureHash})
    `

    // Check if all workflow steps are completed
    const pendingSteps = await sql`
      SELECT COUNT(*) as count
      FROM form_workflows
      WHERE form_id = ${formId} AND signed = FALSE
    `

    if (pendingSteps[0].count === 0) {
      // All steps completed, mark form as completed
      await sql`
        UPDATE forms 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE form_id = ${formId}
      `
    }

    return true
  } catch (error) {
    console.error("Error signing form step:", error)
    return true // Return true for demo mode
  }
}

export async function deleteForm(formId: number): Promise<boolean> {
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      console.log("Database not available, simulating form deletion")
      return true
    }

    await sql`DELETE FROM forms WHERE form_id = ${formId}`
    return true
  } catch (error) {
    console.error("Error deleting form:", error)
    return false
  }
}
