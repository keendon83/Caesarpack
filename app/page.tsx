import { redirect } from "next/navigation"
import { getCurrentUser } from "./actions"

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    // User is authenticated, redirect to dashboard
    redirect("/dashboard")
  } else {
    // User is not authenticated, redirect to login
    redirect("/login")
  }
}
