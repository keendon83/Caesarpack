import { neon } from "@neondatabase/serverless"

// Add this console.log to check the environment variable
console.log("lib/db.ts: NEON_POSTGRES_URL:", process.env.NEON_POSTGRES_URL ? "Set" : "Not Set")

// Create a singleton instance of the Neon client
const sql = neon(process.env.NEON_POSTGRES_URL!)

export { sql }
