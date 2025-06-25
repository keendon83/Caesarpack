import { NextResponse } from "next/server"
import { authenticateUser, generateToken } from "@/lib/auth"

export async function POST() {
  try {
    console.log("🔐 Demo login attempt")

    // Auto-login with demo user
    const user = await authenticateUser("demo", "demo123")

    if (!user) {
      console.log("❌ Demo user authentication failed")
      return NextResponse.json({ error: "Demo user not found" }, { status: 404 })
    }

    console.log("✅ Demo user authentication successful")

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
    console.error("Demo login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
