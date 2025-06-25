import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    console.log(`🔐 Login attempt for username: ${username}`)

    if (!username || !password) {
      console.log("❌ Missing username or password")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const user = await authenticateUser(username, password)

    if (!user) {
      console.log(`❌ Authentication failed for username: ${username}`)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log(`✅ Authentication successful for username: ${username}`)

    const token = await generateToken(user)

    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        designation: user.designation,
        company: user.company,
      },
    })

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
