import { sql } from "./db"
import { hashPassword } from "./auth"

export interface User {
  user_id: number
  full_name: string
  username: string
  company: string
  designation: string
  role: "admin" | "user"
  created_at: string
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await sql`
      SELECT user_id, full_name, username, company, designation, role, created_at
      FROM users
      ORDER BY created_at DESC
    `

    return users as User[]
  } catch (error) {
    console.error("Error getting users:", error)
    return []
  }
}

export async function createUser(userData: {
  full_name: string
  username: string
  password: string
  company: string
  designation: string
  role: "admin" | "user"
}): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(userData.password)

    await sql`
      INSERT INTO users (full_name, username, hashed_password, company, designation, role)
      VALUES (${userData.full_name}, ${userData.username}, ${hashedPassword}, 
              ${userData.company}, ${userData.designation}, ${userData.role})
    `

    return true
  } catch (error) {
    console.error("Error creating user:", error)
    return false
  }
}

export async function updateUser(
  userId: number,
  userData: {
    full_name: string
    company: string
    designation: string
    role: "admin" | "user"
  },
): Promise<boolean> {
  try {
    await sql`
      UPDATE users 
      SET full_name = ${userData.full_name},
          company = ${userData.company},
          designation = ${userData.designation},
          role = ${userData.role}
      WHERE user_id = ${userId}
    `

    return true
  } catch (error) {
    console.error("Error updating user:", error)
    return false
  }
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(newPassword)

    await sql`
      UPDATE users 
      SET hashed_password = ${hashedPassword}
      WHERE user_id = ${userId}
    `

    return true
  } catch (error) {
    console.error("Error resetting password:", error)
    return false
  }
}

export async function deleteUser(userId: number): Promise<boolean> {
  try {
    await sql`DELETE FROM users WHERE user_id = ${userId}`
    return true
  } catch (error) {
    console.error("Error deleting user:", error)
    return false
  }
}

export async function getUsersByRole(role: "admin" | "user"): Promise<User[]> {
  try {
    const users = await sql`
      SELECT user_id, full_name, username, company, designation, role, created_at
      FROM users
      WHERE role = ${role}
      ORDER BY full_name
    `

    return users as User[]
  } catch (error) {
    console.error("Error getting users by role:", error)
    return []
  }
}
