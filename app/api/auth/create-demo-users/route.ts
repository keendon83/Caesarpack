import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST() {
  try {
    // Check if database is available
    if (!sql || !process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database not configured. Demo accounts are available in fallback mode - you can login directly!",
          fallback: true,
        },
        { status: 200 }, // Return 200 to indicate fallback is available
      )
    }

    // Hash the password 'demo123'
    const hashedPassword = await hashPassword("demo123")

    // Clear existing demo users
    await sql`DELETE FROM users WHERE username IN ('admin', 'demo', 'ras', 'hoz', 'mda', 'nra')`

    // Insert demo users with properly hashed passwords
    const demoUsers = [
      {
        full_name: "Demo Admin",
        username: "admin",
        company: "Demo Company",
        designation: "System Administrator",
        role: "admin",
      },
      { full_name: "Demo User", username: "demo", company: "Demo Company", designation: "Employee", role: "user" },
      {
        full_name: "Sales Director",
        username: "ras",
        company: "Demo Company",
        designation: "Sales Director",
        role: "user",
      },
      {
        full_name: "CEO",
        username: "hoz",
        company: "Demo Company",
        designation: "Chief Executive Officer",
        role: "user",
      },
      {
        full_name: "Finance Manager",
        username: "mda",
        company: "Demo Company",
        designation: "Finance Manager",
        role: "user",
      },
      { full_name: "NRA Officer", username: "nra", company: "Demo Company", designation: "NRA Officer", role: "user" },
    ]

    for (const user of demoUsers) {
      await sql`
        INSERT INTO users (full_name, username, hashed_password, company, designation, role)
        VALUES (${user.full_name}, ${user.username}, ${hashedPassword}, ${user.company}, ${user.designation}, ${user.role})
      `
    }

    return NextResponse.json({
      success: true,
      message: "Demo users created successfully",
      users: demoUsers.map((u) => ({ username: u.username, password: "demo123" })),
    })
  } catch (error) {
    console.error("Create demo users error:", error)
    return NextResponse.json(
      {
        error: "Failed to create demo users in database. Fallback authentication is still available.",
        details: error instanceof Error ? error.message : "Unknown error",
        fallback: true,
      },
      { status: 200 }, // Return 200 since fallback is available
    )
  }
}
