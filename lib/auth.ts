import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { sql, isDatabaseAvailable } from "./db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-for-development-only")

export interface User {
  user_id: number
  full_name: string
  username: string
  company: string
  designation: string
  role: "admin" | "user"
  created_at: string
}

// Fallback demo users for when database is not available
const FALLBACK_USERS = [
  {
    user_id: 1,
    full_name: "Demo Admin",
    username: "admin",
    password: "demo123",
    company: "Demo Company",
    designation: "System Administrator",
    role: "admin" as const,
    created_at: new Date().toISOString(),
  },
  {
    user_id: 2,
    full_name: "Demo User",
    username: "demo",
    password: "demo123",
    company: "Demo Company",
    designation: "Employee",
    role: "user" as const,
    created_at: new Date().toISOString(),
  },
  {
    user_id: 3,
    full_name: "Sales Director",
    username: "ras",
    password: "demo123",
    company: "Demo Company",
    designation: "Sales Director",
    role: "user" as const,
    created_at: new Date().toISOString(),
  },
  {
    user_id: 4,
    full_name: "CEO",
    username: "hoz",
    password: "demo123",
    company: "Demo Company",
    designation: "Chief Executive Officer",
    role: "user" as const,
    created_at: new Date().toISOString(),
  },
  {
    user_id: 5,
    full_name: "Finance Manager",
    username: "mda",
    password: "demo123",
    company: "Demo Company",
    designation: "Finance Manager",
    role: "user" as const,
    created_at: new Date().toISOString(),
  },
  {
    user_id: 6,
    full_name: "NRA Officer",
    username: "nra",
    password: "demo123",
    company: "Demo Company",
    designation: "NRA Officer",
    role: "user" as const,
    created_at: new Date().toISOString(),
  },
]

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error("Password verification error:", error)
    return false
  }
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  console.log(`🔐 Attempting to authenticate user: ${username}`)

  // First, always try fallback authentication
  const fallbackUser = FALLBACK_USERS.find((u) => u.username === username)

  if (fallbackUser && fallbackUser.password === password) {
    console.log(`✅ Fallback authentication successful for user: ${username}`)
    const { password: _, ...userWithoutPassword } = fallbackUser
    return userWithoutPassword as User
  }

  // If no DATABASE_URL is configured, only use fallback
  if (!process.env.DATABASE_URL || !sql) {
    console.log(`❌ Fallback authentication failed for user: ${username}`)
    return null
  }

  // Try database authentication only if database is available
  try {
    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      console.log(`❌ Database not available, fallback auth failed for user: ${username}`)
      return null
    }

    // Database is available, try database authentication
    const users = await sql`
      SELECT user_id, full_name, username, hashed_password, company, designation, role, created_at
      FROM users 
      WHERE username = ${username}
    `

    console.log(`📊 Found ${users.length} users in database with username: ${username}`)

    if (users.length === 0) {
      console.log(`❌ No database user found for: ${username}`)
      return null
    }

    const user = users[0]
    const isValid = await verifyPassword(password, user.hashed_password)

    if (!isValid) {
      console.log(`❌ Database password verification failed for: ${username}`)
      return null
    }

    const { hashed_password, ...userWithoutPassword } = user
    console.log(`✅ Database authentication successful for user: ${username}`)
    return userWithoutPassword as User
  } catch (error) {
    console.error(`❌ Database authentication error for ${username}:`, error)
    return null
  }
}

export async function generateToken(user: User): Promise<string> {
  try {
    const token = await new SignJWT({
      userId: user.user_id,
      username: user.username,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    return token
  } catch (error) {
    console.error("Token generation error:", error)
    throw new Error("Failed to generate token")
  }
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}

export async function getCurrentUser(token: string): Promise<User | null> {
  try {
    const decoded = await verifyToken(token)
    if (!decoded) return null

    // First try fallback users
    const fallbackUser = FALLBACK_USERS.find((u) => u.user_id === decoded.userId)
    if (fallbackUser) {
      const { password: _, ...userWithoutPassword } = fallbackUser
      return userWithoutPassword as User
    }

    // If no database configured, return null if not in fallback
    if (!process.env.DATABASE_URL || !sql) {
      return null
    }

    // Try database
    try {
      const dbAvailable = await isDatabaseAvailable()

      if (!dbAvailable) {
        return null
      }

      const users = await sql`
        SELECT user_id, full_name, username, company, designation, role, created_at
        FROM users 
        WHERE user_id = ${decoded.userId}
      `

      if (users.length > 0) {
        return users[0] as User
      }

      return null
    } catch (error) {
      console.error("Database error in getCurrentUser:", error)
      return null
    }
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }
}
