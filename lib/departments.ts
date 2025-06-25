import { sql } from "./db"

export interface Department {
  department_id: number
  name: string
  created_at: string
}

export async function getAllDepartments(): Promise<Department[]> {
  try {
    const departments = await sql`
      SELECT * FROM departments
      ORDER BY name
    `

    return departments as Department[]
  } catch (error) {
    console.error("Error getting departments:", error)
    return []
  }
}

export async function getRejectionAmountsByDepartment(userId: number): Promise<any[]> {
  try {
    const amounts = await sql`
      SELECT d.name as department_name, 
             SUM(fd.rejection_amount) as total_amount,
             COUNT(fd.form_id) as form_count
      FROM form_departments fd
      INNER JOIN departments d ON fd.department_id = d.department_id
      INNER JOIN forms f ON fd.form_id = f.form_id
      WHERE f.created_by = ${userId} AND f.status = 'completed'
      GROUP BY d.department_id, d.name
      ORDER BY total_amount DESC
    `

    return amounts
  } catch (error) {
    console.error("Error getting rejection amounts:", error)
    return []
  }
}
