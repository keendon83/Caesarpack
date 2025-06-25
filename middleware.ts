import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/auth/login", "/api/auth/demo-login"]

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Check for authentication token
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Verify token
  const decoded = await verifyToken(token)
  if (!decoded) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Admin-only routes
  const adminRoutes = ["/admin"]
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  if (isAdminRoute && decoded.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
