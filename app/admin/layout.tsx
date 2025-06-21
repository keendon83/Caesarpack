import { getCurrentUser } from "@/app/actions" // Revert to using getCurrentUser
import { redirect } from "next/navigation"
import type React from "react"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser() // This will return the dummy user for now

  // For now, we'll allow access if a dummy user exists and has 'admin' role.
  // This will be replaced with actual NextAuth.js session check later.
  if (!user || user.role !== "admin") {
    redirect("/dashboard")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">Access Denied: Admin privileges required.</p>
      </div>
    )
  }

  return <>{children}</>
}
