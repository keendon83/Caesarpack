import { redirect } from "next/navigation"
import { getCurrentUser } from "./actions"

// Make this route dynamic since it uses cookies
export const dynamic = "force-dynamic"

export default async function HomePage() {
  let user = null

  try {
    user = await getCurrentUser()
  } catch (error) {
    console.error("Error getting current user on home page:", error)
  }

  if (user) {
    // User is authenticated, redirect to dashboard
    redirect("/dashboard")
  } else {
    // User is not authenticated, redirect to login
    redirect("/login")
  }
}
