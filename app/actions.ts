"use server"

import { redirect } from "next/navigation"
import { sql } from "@/lib/db" // Import the Neon client
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

const saltRounds = 10

// Add this debug function to investigate the submissions
export async function debugFormSubmissions() {
  try {
    console.log("=== DEBUG: Investigating form submissions ===")

    // Get all form submissions with detailed info
    const submissions = await sql`
      SELECT
        fs.id,
        fs.user_id,
        fs.form_id,
        fs.company,
        fs.is_signed,
        fs.created_at,
        fs.submission_data->>'serialNumber' as serial_number,
        fs.submission_data->>'customerName' as customer_name,
        u.full_name AS user_full_name,
        u.username AS username,
        f.name as form_name,
        f.slug as form_slug
      FROM public.form_submissions fs
      JOIN public.users u ON fs.user_id = u.id
      JOIN public.forms f ON fs.form_id = f.id
      ORDER BY fs.created_at DESC;
    `

    console.log("Total submissions found:", submissions.length)
    console.log("Submissions details:", submissions)

    // Group by user to see who created what
    const submissionsByUser = submissions.reduce((acc: any, sub: any) => {
      const key = sub.username
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push({
        id: sub.id,
        serial_number: sub.serial_number,
        customer_name: sub.customer_name,
        created_at: sub.created_at,
        is_signed: sub.is_signed,
      })
      return acc
    }, {})

    console.log("Submissions grouped by user:", submissionsByUser)

    return {
      total: submissions.length,
      submissions: submissions,
      byUser: submissionsByUser,
    }
  } catch (error: any) {
    console.error("Error debugging form submissions:", error)
    return { error: error.message }
  }
}

// Add function to clean up duplicate submissions
export async function cleanupDuplicateSubmissions() {
  try {
    console.log("=== CLEANUP: Removing duplicate submissions ===")

    // Find duplicates based on serial number and customer name
    const duplicates = await sql`
      WITH ranked_submissions AS (
        SELECT 
          id,
          submission_data->>'serialNumber' as serial_number,
          submission_data->>'customerName' as customer_name,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY 
              submission_data->>'serialNumber',
              submission_data->>'customerName'
            ORDER BY created_at ASC
          ) as rn
        FROM public.form_submissions
        WHERE submission_data->>'serialNumber' IS NOT NULL
        AND submission_data->>'customerName' IS NOT NULL
      )
      SELECT id, serial_number, customer_name, created_at
      FROM ranked_submissions 
      WHERE rn > 1;
    `

    console.log("Found duplicates:", duplicates)

    if (duplicates.length > 0) {
      // Delete the duplicates (keeping the first one of each group)
      for (const duplicate of duplicates) {
        await sql`DELETE FROM public.form_submissions WHERE id = ${duplicate.id};`
        console.log(`Deleted duplicate submission: ${duplicate.id} (${duplicate.customer_name})`)
      }
    }

    revalidatePath("/forms/customer-rejection")
    return {
      success: true,
      deletedCount: duplicates.length,
      deletedSubmissions: duplicates,
    }
  } catch (error: any) {
    console.error("Error cleaning up duplicates:", error)
    return { error: error.message }
  }
}

// NEW: Add analytics function for customer rejection data
export async function getCustomerRejectionAnalytics(fromDate?: string, toDate?: string) {
  try {
    console.log("Fetching customer rejection analytics...", { fromDate, toDate })

    // Get the customer rejection form ID
    const [formEntry] = await sql`SELECT id FROM public.forms WHERE slug = 'customer-rejection';`

    if (!formEntry) {
      return { error: "Customer rejection form not found." }
    }

    console.log("Form ID found:", formEntry.id)

    // First, get all submissions for the form
    let submissions
    if (fromDate && toDate) {
      submissions = await sql`
        SELECT
          fs.id,
          fs.submission_data,
          fs.created_at,
          CAST(COALESCE(fs.submission_data->>'totalDiscount', '0') AS NUMERIC) as total_discount
        FROM public.form_submissions fs
        WHERE fs.form_id = ${formEntry.id}
        AND fs.created_at >= ${fromDate}::date 
        AND fs.created_at <= ${toDate}::date + interval '1 day'
        AND fs.submission_data->>'totalDiscount' IS NOT NULL
        AND fs.submission_data->>'totalDiscount' != ''
        ORDER BY fs.created_at DESC;
      `
    } else if (fromDate) {
      submissions = await sql`
        SELECT
          fs.id,
          fs.submission_data,
          fs.created_at,
          CAST(COALESCE(fs.submission_data->>'totalDiscount', '0') AS NUMERIC) as total_discount
        FROM public.form_submissions fs
        WHERE fs.form_id = ${formEntry.id}
        AND fs.created_at >= ${fromDate}::date
        AND fs.submission_data->>'totalDiscount' IS NOT NULL
        AND fs.submission_data->>'totalDiscount' != ''
        ORDER BY fs.created_at DESC;
      `
    } else if (toDate) {
      submissions = await sql`
        SELECT
          fs.id,
          fs.submission_data,
          fs.created_at,
          CAST(COALESCE(fs.submission_data->>'totalDiscount', '0') AS NUMERIC) as total_discount
        FROM public.form_submissions fs
        WHERE fs.form_id = ${formEntry.id}
        AND fs.created_at <= ${toDate}::date + interval '1 day'
        AND fs.submission_data->>'totalDiscount' IS NOT NULL
        AND fs.submission_data->>'totalDiscount' != ''
        ORDER BY fs.created_at DESC;
      `
    } else {
      submissions = await sql`
        SELECT
          fs.id,
          fs.submission_data,
          fs.created_at,
          CAST(COALESCE(fs.submission_data->>'totalDiscount', '0') AS NUMERIC) as total_discount
        FROM public.form_submissions fs
        WHERE fs.form_id = ${formEntry.id}
        AND fs.submission_data->>'totalDiscount' IS NOT NULL
        AND fs.submission_data->>'totalDiscount' != ''
        ORDER BY fs.created_at DESC;
      `
    }

    console.log("Raw submissions data:", submissions)

    if (!Array.isArray(submissions)) {
      console.error("Submissions is not an array:", submissions)
      return { error: "Failed to fetch submissions data." }
    }

    // Group by department and calculate totals
    const departmentTotals: { [key: string]: { total: number; count: number; submissions: any[] } } = {}
    let grandTotal = 0
    let totalSubmissions = 0

    // Process each submission
    for (const submission of submissions) {
      const discount = Number.parseFloat(submission.total_discount?.toString() || "0") || 0
      const responsibleDepartments = submission.submission_data?.responsibleDepartment || []

      console.log("Processing submission:", {
        id: submission.id,
        discount,
        departments: responsibleDepartments,
      })

      // Handle case where responsibleDepartment might be a string or array
      let departments: string[] = []
      if (Array.isArray(responsibleDepartments)) {
        departments = responsibleDepartments
      } else if (typeof responsibleDepartments === "string") {
        departments = [responsibleDepartments]
      }

      // If no departments specified, use "Unspecified"
      if (departments.length === 0) {
        departments = ["Unspecified"]
      }

      // Add to each responsible department
      for (const department of departments) {
        if (!departmentTotals[department]) {
          departmentTotals[department] = { total: 0, count: 0, submissions: [] }
        }

        departmentTotals[department].total += discount
        departmentTotals[department].count += 1
        departmentTotals[department].submissions.push({
          id: submission.id,
          created_at: submission.created_at,
          total_discount: discount,
          serial_number: submission.submission_data?.serialNumber,
          customer_name: submission.submission_data?.customerName,
        })
      }

      grandTotal += discount
      totalSubmissions += 1
    }

    // Sort departments by total amount (highest first)
    const sortedDepartments = Object.entries(departmentTotals)
      .sort(([, a], [, b]) => b.total - a.total)
      .reduce(
        (acc, [dept, data]) => {
          acc[dept] = data
          return acc
        },
        {} as typeof departmentTotals,
      )

    // Get monthly breakdown
    const monthlyData: { [key: string]: number } = {}
    for (const submission of submissions) {
      const month = new Date(submission.created_at).toISOString().slice(0, 7) // YYYY-MM format
      const discount = Number.parseFloat(submission.total_discount?.toString() || "0") || 0
      monthlyData[month] = (monthlyData[month] || 0) + discount
    }

    console.log("Processed analytics:", {
      departmentTotals: sortedDepartments,
      grandTotal,
      totalSubmissions,
      monthlyData,
    })

    return {
      departmentTotals: sortedDepartments,
      grandTotal,
      totalSubmissions,
      monthlyData,
      dateRange: { fromDate, toDate },
    }
  } catch (error: any) {
    console.error("Error fetching customer rejection analytics:", error)
    return {
      error: error.message || "Failed to fetch analytics.",
      departmentTotals: {},
      grandTotal: 0,
      totalSubmissions: 0,
      monthlyData: {},
      dateRange: { fromDate, toDate },
    }
  }
}

// --- Signature Authentication Function ---
export async function authenticateForSignature(username: string, password: string) {
  console.log("Signature authentication attempt for username:", username)

  try {
    // Find user in database
    const [user] = await sql`
      SELECT id, full_name, username, email, password_hash, company, role 
      FROM public.users 
      WHERE username = ${username};
    `

    if (!user) {
      console.log("User not found for signature authentication:", username)
      return { error: "Invalid username or password." }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      console.log("Invalid password for signature authentication:", username)
      return { error: "Invalid username or password." }
    }

    // Check if user has admin or ceo role (can sign forms)
    if (user.role !== "admin" && user.role !== "ceo") {
      console.log("User does not have signing privileges:", username, "Role:", user.role)
      return { error: "Only administrators and CEOs can sign forms." }
    }

    console.log("Signature authentication successful for:", user.full_name)
    console.log("Cross-account signing enabled - authenticated user can sign from any account")

    return {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        company: user.company,
        role: user.role,
      },
    }
  } catch (error: any) {
    console.error("Error during signature authentication:", error)
    return { error: "Authentication failed. Please try again." }
  }
}

// --- Database Status Functions ---
export async function getDatabaseStatus() {
  try {
    // Test basic connection
    const connectionTest = await sql`SELECT 1 as test;`

    // Get all tables in the public schema
    const tables = await sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `

    // Get all custom types (enums)
    const types = await sql`
      SELECT typname as type_name, typtype as type_type
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
      ORDER BY typname;
    `

    // Get row counts for each table using individual queries
    const tableCounts = []
    for (const table of tables) {
      try {
        let count
        switch (table.table_name) {
          case "users":
            count = await sql`SELECT COUNT(*) as count FROM public.users;`
            break
          case "forms":
            count = await sql`SELECT COUNT(*) as count FROM public.forms;`
            break
          case "user_form_permissions":
            count = await sql`SELECT COUNT(*) as count FROM public.user_form_permissions;`
            break
          case "form_submissions":
            count = await sql`SELECT COUNT(*) as count FROM public.form_submissions;`
            break
          default:
            // For any other tables, use a generic approach
            count = [{ count: 0 }]
        }

        tableCounts.push({
          table_name: table.table_name,
          table_type: table.table_type,
          row_count: Number.parseInt(count[0].count),
        })
      } catch (error) {
        console.error(`Error counting rows for table ${table.table_name}:`, error)
        tableCounts.push({
          table_name: table.table_name,
          table_type: table.table_type,
          row_count: "Error",
        })
      }
    }

    return {
      connected: true,
      tables: tableCounts,
      types: types,
      connection_test: connectionTest[0]?.test === 1,
    }
  } catch (error: any) {
    console.error("Error getting database status:", error)
    return {
      connected: false,
      error: error.message,
      tables: [],
      types: [],
      connection_test: false,
    }
  }
}

// --- Database Setup Function ---
export async function initializeDatabase() {
  try {
    console.log("Initializing database tables...")

    // Create enum types (using DO block to handle IF NOT EXISTS)
    await sql`
      DO $$ BEGIN
        CREATE TYPE company_enum AS ENUM (
          'Caesarpack Holdings',
          'Caesarpac Kuwait',
          'KuwaitBoxes',
          'Caesarpac Iraq'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `

    await sql`
      DO $$ BEGIN
        CREATE TYPE user_role_enum AS ENUM (
          'admin',
          'employee',
          'ceo'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        company company_enum NOT NULL,
        role user_role_enum NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `

    // Create forms table
    await sql`
      CREATE TABLE IF NOT EXISTS public.forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `

    // Create user_form_permissions table
    await sql`
      CREATE TABLE IF NOT EXISTS public.user_form_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE (user_id, form_id)
      );
    `

    // Create form_submissions table
    await sql`
      CREATE TABLE IF NOT EXISTS public.form_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
        company company_enum NOT NULL,
        submission_data JSONB NOT NULL,
        is_signed BOOLEAN DEFAULT FALSE,
        signed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        signed_at TIMESTAMP WITH TIME ZONE,
        pdf_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `

    // Insert initial form data
    await sql`
      INSERT INTO public.forms (name, slug, description)
      VALUES ('Customer Rejection', 'customer-rejection', 'Form for recording customer rejections and complaints.')
      ON CONFLICT (slug) DO NOTHING;
    `

    console.log("Database initialization completed successfully!")
    return { success: true }
  } catch (error: any) {
    console.error("Error initializing database:", error)
    return { error: error.message || "Failed to initialize database." }
  }
}

// Add this new function after the initializeDatabase function
export async function addCeoRoleToEnum() {
  try {
    console.log("Adding CEO role to user_role_enum...")

    // Check if the enum value already exists
    const existingValues = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'user_role_enum'
      );
    `

    const hasRole = existingValues.some((row: any) => row.enumlabel === "ceo")

    if (!hasRole) {
      await sql`ALTER TYPE user_role_enum ADD VALUE 'ceo';`
      console.log("CEO role added successfully!")
    } else {
      console.log("CEO role already exists")
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error adding CEO role:", error)
    return { error: error.message || "Failed to add CEO role." }
  }
}

// --- Auth Actions (Updated implementation) ---
export async function signIn(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  console.log("Sign In attempt for username:", username)

  try {
    // Try to find user in database
    const [user] = await sql`
      SELECT id, full_name, username, email, password_hash, company, role 
      FROM public.users 
      WHERE username = ${username};
    `

    if (!user) {
      console.log("User not found:", username)
      return { error: "Invalid username or password." }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      console.log("Invalid password for user:", username)
      return { error: "Invalid username or password." }
    }

    // Set session cookie for successful authentication
    const userToStore = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      company: user.company,
      role: user.role,
    }

    const cookieStore = await cookies()
    cookieStore.set("user_session", JSON.stringify(userToStore), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    console.log("Login successful for:", user.full_name)
  } catch (error: any) {
    console.error("Error during database query:", error)
    return { error: "Authentication failed. Please try again." }
  }

  // Redirect to dashboard on successful login
  redirect("/dashboard")
}

export async function signOut() {
  console.log("Sign Out action")
  const cookieStore = await cookies()
  cookieStore.delete("user_session")
  redirect("/login")
}

// UPDATED: Enhanced error handling for getCurrentUser
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userSession = cookieStore.get("user_session")

    console.log("getCurrentUser called - Session exists:", !!userSession)

    if (userSession) {
      const user = JSON.parse(userSession.value)
      console.log("Retrieved user from session:", user.username, "Role:", user.role)
      return user
    }
  } catch (error) {
    console.error("Error getting user from session:", error)
    // Don't throw the error, just return null
  }

  // Return null if no valid session found
  console.log("No user session found - user not authenticated")
  return null
}

// --- User Management Actions (Now using Neon) ---
export async function getUsers() {
  try {
    console.log("Attempting to fetch users from public.users table...")

    // First, try to initialize the database if tables don't exist
    try {
      const users =
        await sql`SELECT id, full_name, username, email, company, role FROM public.users ORDER BY created_at DESC;`
      return users
    } catch (tableError: any) {
      if (tableError.message.includes('relation "public.users" does not exist')) {
        console.log("Users table doesn't exist, initializing database...")
        const initResult = await initializeDatabase()
        if (initResult.error) {
          throw new Error(initResult.error)
        }
        // Try again after initialization
        const users =
          await sql`SELECT id, full_name, username, email, company, role FROM public.users ORDER BY created_at DESC;`
        return users
      } else {
        throw tableError
      }
    }
  } catch (error: any) {
    console.error("Error fetching users from Neon:", error)
    return []
  }
}

export async function createUser(userData: {
  full_name: string
  username: string
  email: string
  password?: string
  company: string
  role: string
}) {
  const { password, ...rest } = userData

  if (!password) {
    return { error: "Password is required for new users." }
  }

  try {
    const password_hash = await bcrypt.hash(password, saltRounds)

    const [newUser] = await sql`
      INSERT INTO public.users (full_name, username, email, password_hash, company, role)
      VALUES (${rest.full_name}, ${rest.username}, ${rest.email}, ${password_hash}, ${rest.company}::company_enum, ${rest.role}::user_role_enum)
      RETURNING id, full_name, username, email, company, role;
    `
    revalidatePath("/admin/users")
    return { data: newUser }
  } catch (error: any) {
    console.error("Error creating user in Neon:", error)
    if (error.message.includes("duplicate key value violates unique constraint")) {
      return { error: "A user with this username or email already exists." }
    }
    return { error: error.message || "Failed to create user." }
  }
}

export async function updateUser(
  id: string,
  userData: {
    full_name?: string
    username?: string
    email?: string
    password?: string
    company?: string
    role?: string
  },
) {
  try {
    const updateFields: string[] = []
    const updateValues: any[] = []

    if (userData.full_name !== undefined) {
      updateFields.push(`full_name = '${userData.full_name}'`)
    }
    if (userData.username !== undefined) {
      updateFields.push(`username = '${userData.username}'`)
    }
    if (userData.email !== undefined) {
      updateFields.push(`email = '${userData.email}'`)
    }
    if (userData.password !== undefined && userData.password !== "") {
      const password_hash = await bcrypt.hash(userData.password, saltRounds)
      updateFields.push(`password_hash = '${password_hash}'`)
    }
    if (userData.company !== undefined) {
      updateFields.push(`company = '${userData.company}'::company_enum`)
    }
    if (userData.role !== undefined) {
      updateFields.push(`role = '${userData.role}'::user_role_enum`)
    }

    if (updateFields.length === 0) {
      return { data: null, error: "No fields to update." }
    }

    // Use template literal with sql`` instead of sql.unsafe
    const updateQuery = `
      UPDATE public.users
      SET ${updateFields.join(", ")}
      WHERE id = '${id}'
      RETURNING id, full_name, username, email, company, role;
    `

    console.log("Update query:", updateQuery)

    const result = await sql.unsafe(updateQuery)
    const updatedUser = Array.isArray(result) ? result[0] : result

    console.log("Update result:", updatedUser)

    revalidatePath("/admin/users")
    return { data: updatedUser }
  } catch (error: any) {
    console.error("Error updating user in Neon:", error)
    if (error.message.includes("duplicate key value violates unique constraint")) {
      return { error: "A user with this username or email already exists." }
    }
    return { error: error.message || "Failed to update user." }
  }
}

export async function deleteUser(id: string) {
  try {
    await sql`DELETE FROM public.users WHERE id = ${id};`
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting user from Neon:", error)
    return { error: error.message || "Failed to delete user." }
  }
}

// --- Form Management Actions (Now using Neon) ---
export async function getForms() {
  try {
    const forms = await sql`SELECT id, name, slug, description FROM public.forms ORDER BY created_at ASC;`
    return forms
  } catch (error: any) {
    console.error("Error fetching forms from Neon:", error)
    return []
  }
}

// --- Permission Management Actions (Now using Neon) ---
export async function getUserFormPermissions(userId: string) {
  try {
    const permissions = await sql`SELECT form_id FROM public.user_form_permissions WHERE user_id = ${userId};`
    return permissions.map((p: any) => p.form_id)
  } catch (error: any) {
    console.error("Error fetching user form permissions from Neon:", error)
    return []
  }
}

export async function updateUserFormPermissions(userId: string, formIds: string[]) {
  try {
    await sql`DELETE FROM public.user_form_permissions WHERE user_id = ${userId};`

    if (formIds.length > 0) {
      // Insert permissions one by one instead of using batch insert
      for (const formId of formIds) {
        await sql`
          INSERT INTO public.user_form_permissions (user_id, form_id)
          VALUES (${userId}, ${formId});
        `
      }
    }

    revalidatePath("/admin/permissions")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating user form permissions in Neon:", error)
    return { error: error.message || "Failed to update permissions." }
  }
}

// --- Form Submission Actions (Now using Neon) ---
export async function submitCustomerRejectionForm(formData: any) {
  const currentUser = await getCurrentUser()
  console.log("submitCustomerRejectionForm - Current user:", currentUser)

  if (!currentUser) {
    return { error: "User not authenticated." }
  }

  try {
    // First ensure the form exists
    const [formEntry] = await sql`SELECT id FROM public.forms WHERE slug = 'customer-rejection';`
    console.log("Form entry found:", formEntry)

    if (!formEntry) {
      return { error: "Form not found." }
    }

    // Check for existing submission with same serial number and customer name to prevent duplicates
    if (formData.serialNumber && formData.customerName) {
      const existingSubmission = await sql`
        SELECT id FROM public.form_submissions 
        WHERE form_id = ${formEntry.id}
        AND submission_data->>'serialNumber' = ${formData.serialNumber}
        AND submission_data->>'customerName' = ${formData.customerName}
        LIMIT 1;
      `

      if (existingSubmission.length > 0) {
        return { error: "A submission with this serial number and customer name already exists." }
      }
    }

    console.log("Attempting to insert form submission with data:", {
      user_id: currentUser.id,
      form_id: formEntry.id,
      company: currentUser.company,
      submission_data: formData,
    })

    const [newSubmission] = await sql`
      INSERT INTO public.form_submissions (user_id, form_id, company, submission_data)
      VALUES (${currentUser.id}, ${formEntry.id}, ${currentUser.company}::company_enum, ${JSON.stringify(formData)}::jsonb)
      RETURNING id, created_at;
    `

    console.log("Form submission created successfully:", newSubmission)
    revalidatePath("/forms/customer-rejection")
    return { data: newSubmission }
  } catch (error: any) {
    console.error("Error submitting form to Neon:", error)
    return { error: error.message || "Failed to submit form." }
  }
}

export async function getCustomerRejectionFormSubmissions() {
  const currentUser = await getCurrentUser()
  console.log("getCustomerRejectionFormSubmissions - Current user:", currentUser)

  if (!currentUser) {
    console.log("No current user found")
    return { error: "User not authenticated." }
  }

  try {
    const [formEntry] = await sql`SELECT id FROM public.forms WHERE slug = 'customer-rejection';`
    console.log("Form entry for submissions:", formEntry)

    if (!formEntry) {
      console.log("Form not found")
      return { error: "Form not found." }
    }

    console.log("Querying submissions for form_id:", formEntry.id)

    // Update the SQL query to properly get the signer information:
    const submissions = await sql`
      SELECT
        fs.id,
        fs.submission_data,
        fs.company,
        fs.is_signed,
        fs.signed_at,
        fs.pdf_url,
        fs.created_at,
        u.full_name AS user_full_name,
        u.company AS user_company,
        u.role AS user_role,
        signer.full_name AS signed_by_user_full_name,
        signer.role AS signed_by_user_role
      FROM public.form_submissions fs
      JOIN public.users u ON fs.user_id = u.id
      LEFT JOIN public.users signer ON fs.signed_by = signer.id
      WHERE fs.form_id = ${formEntry.id}
      ORDER BY fs.created_at DESC;
    `

    console.log("Raw submissions query result:", submissions)

    // And update the formatted submissions to include the signer info:
    const formattedSubmissions = submissions.map((s: any) => ({
      ...s,
      users: { full_name: s.user_full_name, company: s.user_company, role: s.user_role },
      signed_by_user_full_name: s.signed_by_user_full_name,
      signed_by_user_role: s.signed_by_user_role,
    }))

    console.log("Formatted submissions:", formattedSubmissions)
    return formattedSubmissions
  } catch (error: any) {
    console.error("Error fetching form submissions from Neon:", error)
    return { error: error.message || "Failed to fetch submissions." }
  }
}

export async function getCustomerRejectionFormSubmission(id: string) {
  const currentUser = await getCurrentUser()
  console.log("getCustomerRejectionFormSubmission - Current user:", currentUser)
  console.log("getCustomerRejectionFormSubmission - Submission ID:", id)

  if (!currentUser) {
    return { error: "User not authenticated." }
  }

  try {
    console.log("Querying for submission with ID:", id)

    const [submission] = await sql`
      SELECT
        fs.id,
        fs.submission_data,
        fs.company,
        fs.is_signed,
        fs.signed_at,
        fs.pdf_url,
        fs.created_at,
        u.full_name AS user_full_name,
        u.company AS user_company,
        u.role AS user_role,
        sbu.full_name AS signed_by_user_full_name
      FROM public.form_submissions fs
      JOIN public.users u ON fs.user_id = u.id
      LEFT JOIN public.users sbu ON fs.signed_by = sbu.id
      WHERE fs.id = ${id};
    `

    console.log("Raw submission query result:", submission)

    if (!submission) {
      console.log("No submission found with ID:", id)
      return { error: "Submission not found." }
    }

    const formattedSubmission = {
      ...submission,
      users: { full_name: submission.user_full_name, company: submission.user_company, role: submission.user_role },
      signed_by_user: submission.signed_by_user_full_name ? { full_name: submission.signed_by_user_full_name } : null,
    }

    console.log("Formatted submission:", formattedSubmission)

    return {
      data: formattedSubmission,
    }
  } catch (error: any) {
    console.error("Error fetching single form submission from Neon:", error)
    return { error: error.message || "Failed to fetch submission." }
  }
}

// FIXED: This function now accepts the authenticated signer's ID instead of using current user
export async function signCustomerRejectionForm(id: string, signatureData: string, authenticatedSignerId: string) {
  console.log("signCustomerRejectionForm called with:", {
    submissionId: id,
    authenticatedSignerId: authenticatedSignerId,
    hasSignature: !!signatureData,
  })

  try {
    // Verify the authenticated signer exists and has proper role
    const [signer] = await sql`
      SELECT id, full_name, username, role 
      FROM public.users 
      WHERE id = ${authenticatedSignerId};
    `

    if (!signer) {
      console.log("Authenticated signer not found:", authenticatedSignerId)
      return { error: "Authenticated signer not found." }
    }

    if (signer.role !== "admin" && signer.role !== "ceo") {
      console.log("Signer does not have proper role:", signer.role)
      return { error: "Only administrators and CEOs can sign forms." }
    }

    console.log("Signing form with authenticated user:", signer.full_name, "Role:", signer.role)

    const [updatedSubmission] = await sql`
      UPDATE public.form_submissions
      SET
        is_signed = TRUE,
        signed_by = ${authenticatedSignerId},
        signed_at = NOW(),
        submission_data = jsonb_set(submission_data, '{signature}', ${JSON.stringify(signatureData)}::jsonb)
      WHERE id = ${id}
      RETURNING id, is_signed, signed_at;
    `

    console.log("Form signing result:", updatedSubmission)

    if (!updatedSubmission) {
      return { error: "Failed to update form submission." }
    }

    revalidatePath(`/forms/customer-rejection/${id}`)
    revalidatePath("/forms/customer-rejection")

    return {
      data: updatedSubmission,
      message: `Form signed successfully by ${signer.full_name}`,
    }
  } catch (error: any) {
    console.error("Error signing form in Neon:", error)
    return { error: error.message || "Failed to sign form." }
  }
}

export async function unlockCustomerRejectionForm(id: string) {
  // This action should ideally be restricted to admins only
  // For now, it uses the dummy admin user
  try {
    const [updatedSubmission] = await sql`
      UPDATE public.form_submissions
      SET
        is_signed = FALSE,
        signed_by = NULL,
        signed_at = NULL,
        pdf_url = NULL,
        submission_data = jsonb_set(submission_data, '{signature}', 'null'::jsonb)
      WHERE id = ${id}
      RETURNING id;
    `
    revalidatePath(`/forms/customer-rejection/${id}`)
    return { data: updatedSubmission }
  } catch (error: any) {
    console.error("Error unlocking form in Neon:", error)
    return { error: error.message || "Failed to unlock form." }
  }
}

export async function deleteCustomerRejectionFormSubmission(id: string) {
  // This action should ideally be restricted to admins only
  // For now, it uses the dummy admin user
  try {
    await sql`DELETE FROM public.form_submissions WHERE id = ${id};`
    revalidatePath("/forms/customer-rejection")
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting form submission from Neon:", error)
    return { error: error.message || "Failed to delete form submission." }
  }
}

export async function updateCustomerRejectionFormSubmission(id: string, formData: any) {
  // This action should ideally be restricted to admins only
  // For now, it uses the dummy admin user
  try {
    const [updatedSubmission] = await sql`
      UPDATE public.form_submissions
      SET submission_data = ${JSON.stringify(formData)}::jsonb
      WHERE id = ${id}
      RETURNING id;
    `
    revalidatePath(`/forms/customer-rejection/${id}`)
    return { data: updatedSubmission }
  } catch (error: any) {
    console.error("Error updating form submission in Neon:", error)
    return { error: error.message || "Failed to update form submission." }
  }
}

// Simplified PDF handling - no external storage needed
export async function uploadPdfToSupabase(base64Pdf: string, filename: string) {
  // This function is no longer needed since we're downloading PDFs directly
  return {
    success: true,
    message: "PDF generated and downloaded directly to user's device",
  }
}

export async function updatePdfUrlInSubmission(submissionId: string, pdfUrl: string) {
  // This function is no longer needed since we're not storing PDF URLs
  return {
    success: true,
    message: "PDF downloaded directly, no URL storage needed",
  }
}

// Add this function to clean up all duplicates right now
export async function removeAllDuplicateSubmissions() {
  try {
    console.log("=== REMOVING ALL DUPLICATE SUBMISSIONS ===")

    // Get all submissions
    const allSubmissions = await sql`
      SELECT 
        id,
        submission_data->>'serialNumber' as serial_number,
        submission_data->>'customerName' as customer_name,
        created_at,
        user_id
      FROM public.form_submissions
      ORDER BY created_at ASC;
    `

    console.log("All submissions:", allSubmissions)

    // Group by serial number and customer name
    const groups: { [key: string]: any[] } = {}

    for (const submission of allSubmissions) {
      const key = `${submission.serial_number}-${submission.customer_name}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(submission)
    }

    let deletedCount = 0
    const deletedIds: string[] = []

    // For each group, keep only the first one (oldest) and delete the rest
    for (const [key, submissions] of Object.entries(groups)) {
      if (submissions.length > 1) {
        console.log(`Found ${submissions.length} duplicates for ${key}`)

        // Keep the first one, delete the rest
        for (let i = 1; i < submissions.length; i++) {
          const submissionToDelete = submissions[i]
          await sql`DELETE FROM public.form_submissions WHERE id = ${submissionToDelete.id};`
          deletedIds.push(submissionToDelete.id)
          deletedCount++
          console.log(`Deleted duplicate submission: ${submissionToDelete.id}`)
        }
      }
    }

    revalidatePath("/forms/customer-rejection")

    return {
      success: true,
      deletedCount,
      deletedIds,
      message: `Removed ${deletedCount} duplicate submissions`,
    }
  } catch (error: any) {
    console.error("Error removing duplicates:", error)
    return { error: error.message }
  }
}
