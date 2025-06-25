import { neon } from "@neondatabase/serverless"

// Get all possible database URLs from environment
const DATABASE_URLS = {
  DATABASE_URL: process.env.DATABASE_URL,
  POSTGRES_URL: process.env.POSTGRES_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
}

// Log what we found (without exposing sensitive data)
console.log("🔍 Environment variables check:")
Object.entries(DATABASE_URLS).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 20)}...${value.substring(value.length - 10)}`)
  } else {
    console.log(`❌ ${key}: not set`)
  }
})

// Prioritize non-pooled connections for serverless environments
const DATABASE_URL =
  DATABASE_URLS.DATABASE_URL_UNPOOLED ||
  DATABASE_URLS.POSTGRES_URL_NON_POOLING ||
  DATABASE_URLS.DATABASE_URL ||
  DATABASE_URLS.POSTGRES_URL

let sql: any = null
let sqlInitError: string | null = null

if (DATABASE_URL) {
  try {
    // Validate URL format before creating client
    if (!DATABASE_URL.startsWith("postgresql://") && !DATABASE_URL.startsWith("postgres://")) {
      throw new Error("DATABASE_URL must start with postgresql:// or postgres://")
    }

    sql = neon(DATABASE_URL)
    console.log(`✅ Neon client initialized successfully`)
  } catch (error) {
    sqlInitError = error instanceof Error ? error.message : "Unknown initialization error"
    console.error("❌ Failed to initialize Neon client:", sqlInitError)
  }
} else {
  console.warn("⚠️ No database URL found in any environment variable. Using fallback mode.")
}

export { sql }

export function isDatabaseConfigured(): boolean {
  return !!DATABASE_URL && !!sql && !sqlInitError
}

export function getDatabaseInfo() {
  return {
    hasUrl: !!DATABASE_URL,
    urlType: DATABASE_URLS.DATABASE_URL_UNPOOLED
      ? "non-pooled"
      : DATABASE_URLS.POSTGRES_URL_NON_POOLING
        ? "non-pooled"
        : DATABASE_URLS.DATABASE_URL
          ? "pooled"
          : DATABASE_URLS.POSTGRES_URL
            ? "pooled"
            : "none",
    hasClient: !!sql,
    initError: sqlInitError,
    urlPrefix: DATABASE_URL ? DATABASE_URL.substring(0, 30) + "..." : "none",
  }
}

// Database health check with comprehensive error handling
export async function checkDatabaseHealth() {
  const dbInfo = getDatabaseInfo()

  console.log("🏥 Database health check starting:", dbInfo)

  // Check if DATABASE_URL is configured
  if (!DATABASE_URL) {
    return {
      healthy: false,
      message: "DATABASE_URL not configured. Running in demo mode.",
      details: "No database URL found in environment variables. Check Vercel environment variables.",
      suggestion: "Add DATABASE_URL to your Vercel project environment variables and redeploy.",
      debugInfo: dbInfo,
    }
  }

  // Check if SQL client initialization failed
  if (sqlInitError) {
    return {
      healthy: false,
      message: "Database client initialization failed. Running in demo mode.",
      details: `Neon client initialization error: ${sqlInitError}`,
      suggestion: "Check if your DATABASE_URL format is correct. Try using a non-pooled connection string.",
      debugInfo: dbInfo,
    }
  }

  // Check if SQL client is available
  if (!sql) {
    return {
      healthy: false,
      message: "Database client not available. Running in demo mode.",
      details: "The Neon SQL client could not be created despite having a DATABASE_URL.",
      suggestion: "This might be an environment issue. Try redeploying your application.",
      debugInfo: dbInfo,
    }
  }

  try {
    console.log("🔌 Attempting database connection...")

    // Test the actual database connection with a longer timeout for first connection
    const connectionTest = async () => {
      const startTime = Date.now()
      try {
        const result = await sql`SELECT 
          1 as health, 
          version() as db_version, 
          current_timestamp as test_time,
          current_database() as db_name`

        const endTime = Date.now()
        console.log(`✅ Database query successful in ${endTime - startTime}ms`)
        return result
      } catch (dbError) {
        const endTime = Date.now()
        console.error(`❌ Database query failed after ${endTime - startTime}ms:`, dbError)
        throw dbError
      }
    }

    const result = await Promise.race([
      connectionTest(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout after 10 seconds")), 10000),
      ),
    ])

    return {
      healthy: true,
      message: "Database connection successful",
      version: result[0]?.db_version?.split(" ")[0] || "PostgreSQL",
      details: `Connected to database: ${result[0]?.db_name || "unknown"}`,
      debugInfo: dbInfo,
    }
  } catch (error) {
    console.error("❌ Database health check failed:", error)

    let message = "Database connection failed. Running in demo mode."
    let details = error instanceof Error ? error.message : "Unknown error"
    let suggestion = "Please verify your DATABASE_URL and network settings."

    // Analyze the error type for better messaging
    if (error instanceof TypeError) {
      if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
        message = "Network Error: Cannot reach database server."
        details = `Network fetch failed. This often indicates the database URL is unreachable or there are network restrictions in the serverless environment. Error: ${details}`
        suggestion =
          "1. Verify your DATABASE_URL is correct. 2. Try using a non-pooled connection string. 3. Ensure your Neon database is active. 4. Redeploy your Vercel application."
      }
    } else if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        message = "Database connection timeout."
        details = `Database did not respond within 10 seconds: ${details}`
        suggestion =
          "1. Check if your Neon database is active. 2. Try a non-pooled connection string. 3. Check for network latency issues."
      } else if (error.message.includes("authentication") || error.message.includes("password")) {
        message = "Database authentication failed."
        details = `Authentication error: ${details}`
        suggestion = "Verify your username and password in the DATABASE_URL match your Neon database credentials."
      } else if (error.message.includes("database") && error.message.includes("does not exist")) {
        message = "Database does not exist."
        details = `Database not found: ${details}`
        suggestion = "Verify the database name in your DATABASE_URL matches your Neon database name."
      }
    }

    return {
      healthy: false,
      message,
      details,
      suggestion,
      debugInfo: dbInfo,
    }
  }
}

// Check if database is available without throwing errors
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false
  }

  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
    ])
    return true
  } catch (error) {
    console.error("Database availability check failed:", error)
    return false
  }
}
