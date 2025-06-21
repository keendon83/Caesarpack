import { getCurrentUser } from "@/app/actions"
import { redirect } from "next/navigation"
import type React from "react"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

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
