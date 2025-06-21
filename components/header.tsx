import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { CircleUser, Package2 } from "lucide-react"
import { signOut } from "@/app/actions"

interface User {
  id: string
  full_name: string
  username: string
  email: string
  company: string
  role: string
}

export function Header({ user }: { user: User }) {
  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link href="#" className="flex items-center gap-2 text-lg font-semibold md:text-base">
          <Package2 className="h-6 w-6" />
          <span className="sr-only">Caesar Pack</span>
        </Link>
        <Link href="/dashboard" className="text-foreground transition-colors hover:text-foreground">
          Dashboard
        </Link>
        <Link href="/forms" className="text-muted-foreground transition-colors hover:text-foreground">
          Forms
        </Link>
        {user.role === "admin" && (
          <Link href="/admin/users" className="text-muted-foreground transition-colors hover:text-foreground">
            Admin
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.full_name}</DropdownMenuLabel>
            <DropdownMenuLabel className="text-sm text-muted-foreground font-normal">{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <form action={signOut} className="w-full">
                <Button type="submit" variant="ghost" className="w-full justify-start p-0 h-auto">
                  Logout
                </Button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
