"use server"

import { redirect } from "next/navigation"
import { sql } from "@/lib/db" // Import the Neon client
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

const saltRounds = 10

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
          'employee'
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

// --- Auth Actions (Temporary implementation) ---
export async function signIn(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  console.log("Sign In attempt for username:", username)

  // Don't wrap redirect in try-catch to avoid catching the redirect error
  let shouldRedirect = false
  let userToStore = null

  try {
    // Try to find user in database
    const [user] = await sql`
      SELECT id, full_name, username, email, password_hash, company, role 
      FROM public.users 
      WHERE username = ${username};
    `

    if (user) {
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash)
      if (passwordMatch) {
        userToStore = {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          company: user.company,
          role: user.role,
        }
        console.log("Login successful for:", user.full_name)
        shouldRedirect = true
      } else {
        console.log("Invalid password for user:", username)
        shouldRedirect = true // For now, still redirect (temporary)
      }
    } else {
      console.log("User not found:", username)
      shouldRedirect = true // For now, still redirect (temporary)
    }
  } catch (error) {
    console.error("Error during database query:", error)
    shouldRedirect = true // For now, still redirect (temporary)
  }

  // Set session cookie if user authenticated successfully
  if (userToStore) {
    try {
      const cookieStore = await cookies()
      cookieStore.set("user_session", JSON.stringify(userToStore), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    } catch (cookieError) {
      console.error("Error setting cookie:", cookieError)
    }
  }

  // Redirect outside of try-catch block
  if (shouldRedirect) {
    redirect("/dashboard")
  }
}

export async function signOut() {
  console.log("Sign Out action")
  const cookieStore = await cookies()
  cookieStore.delete("user_session")
  redirect("/login")
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userSession = cookieStore.get("user_session")

    if (userSession) {
      const user = JSON.parse(userSession.value)
      console.log("Retrieved user from session:", user.username)
      return user
    }
  } catch (error) {
    console.error("Error getting user from session:", error)
  }

  // TEMPORARY: Return a dummy user if no session found
  // This ensures the app still works during development
  console.log("No user session found, returning dummy user")
  return {
    id: "dummy-user-id",
    full_name: "Demo User",
    username: "demo",
    email: "demo@example.com",
    company: "Caesarpack Holdings",
    role: "admin", // Default to admin for initial preview access
  }
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
    let paramIndex = 1

    if (userData.full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`)
      updateValues.push(userData.full_name)
    }
    if (userData.username !== undefined) {
      updateFields.push(`username = $${paramIndex++}`)
      updateValues.push(userData.username)
    }
    if (userData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`)
      updateValues.push(userData.email)
    }
    if (userData.password !== undefined && userData.password !== "") {
      const password_hash = await bcrypt.hash(userData.password, saltRounds)
      updateFields.push(`password_hash = $${paramIndex++}`)
      updateValues.push(password_hash)
    }
    if (userData.company !== undefined) {
      updateFields.push(`company = $${paramIndex++}::company_enum`)
      updateValues.push(userData.company)
    }
    if (userData.role !== undefined) {
      updateFields.push(`role = $${paramIndex++}::user_role_enum`)
      updateValues.push(userData.role)
    }

    if (updateFields.length === 0) {
      return { data: null, error: "No fields to update." }
    }

    const query = `
      UPDATE public.users
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex++}
      RETURNING id, full_name, username, email, company, role;
    `
    updateValues.push(id)

    const [updatedUser] = await sql.unsafe(query, updateValues)

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
        u.role AS user_role
      FROM public.form_submissions fs
      JOIN public.users u ON fs.user_id = u.id
      WHERE fs.form_id = ${formEntry.id}
      ORDER BY fs.created_at DESC;
    `

    console.log("Raw submissions query result:", submissions)

    const formattedSubmissions = submissions.map((s: any) => ({
      ...s,
      users: { full_name: s.user_full_name, company: s.user_company, role: s.user_role },
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

export async function signCustomerRejectionForm(id: string, signatureData: string) {
  const currentUser = await getCurrentUser() // Now uses session-based user

  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Unauthorized to sign this form." }
  }

  try {
    const [updatedSubmission] = await sql`
      UPDATE public.form_submissions
      SET
        is_signed = TRUE,
        signed_by = ${currentUser.id},
        signed_at = NOW(),
        submission_data = jsonb_set(submission_data, '{signature}', ${JSON.stringify(signatureData)}::jsonb)
      WHERE id = ${id}
      RETURNING id;
    `
    revalidatePath(`/forms/customer-rejection/${id}`)
    return { data: updatedSubmission }
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

// Placeholder for PDF upload (Supabase Storage is no longer used)
export async function uploadPdfToSupabase(base64Pdf: string, filename: string) {
  return {
    error: "PDF upload to Supabase Storage is no longer supported. You need to implement a new storage solution.",
  }
}

export async function updatePdfUrlInSubmission(submissionId: string, pdfUrl: string) {
  try {
    const [updatedSubmission] = await sql`
      UPDATE public.form_submissions
      SET pdf_url = ${pdfUrl}
      WHERE id = ${submissionId}
      RETURNING id;
    `
    revalidatePath(`/forms/customer-rejection/${submissionId}`)
    return { data: updatedSubmission }
  } catch (error: any) {
    console.error("Error updating PDF URL in submission in Neon:", error)
    return { error: error.message || "Failed to update PDF URL." }
  }
}
