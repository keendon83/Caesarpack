import { getCurrentUser } from "@/app/actions"
import { redirect } from "next/navigation"
import type React from "react"

// Make this route dynamic since it uses cookies
export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user = null

  try {
    user = await getCurrentUser()
  } catch (error) {
    console.error("Error getting current user in admin layout:", error)
  }

  // Check if user is authenticated
  if (!user) {
    redirect("/login")
    return null
  }

  // Check if user has admin privileges
  if (user.role !== "admin") {
    redirect("/dashboard")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">Access Denied: Admin privileges required.</p>
      </div>
    )
  }

  return <>{children}</>
}
