"use client"

import Link from "next/link"
import { Package2, Home, FileText, Users, Settings, Database, Bug } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-16 items-center border-b px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Package2 className="h-6 w-6" />
            <span className="">Caesar Pack</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === "/dashboard" && "bg-muted text-primary",
              )}
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/forms"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname.startsWith("/forms") && "bg-muted text-primary",
              )}
            >
              <FileText className="h-4 w-4" />
              Forms
            </Link>
            {userRole === "admin" && (
              <>
                <div className="mt-4 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Admin Panel</div>
                <Link
                  href="/admin/users"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname.startsWith("/admin/users") && "bg-muted text-primary",
                  )}
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
                <Link
                  href="/admin/permissions"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname.startsWith("/admin/permissions") && "bg-muted text-primary",
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Permissions
                </Link>
                <Link
                  href="/admin/database"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname.startsWith("/admin/database") && "bg-muted text-primary",
                  )}
                >
                  <Database className="h-4 w-4" />
                  Database
                </Link>
                <Link
                  href="/admin/debug"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname.startsWith("/admin/debug") && "bg-muted text-primary",
                  )}
                >
                  <Bug className="h-4 w-4" />
                  Debug
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}
