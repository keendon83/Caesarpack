import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { getCurrentUser } from "./actions"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Caesar Pack Internal App",
  description: "Internal web application for Caesar Pack employees.",
    generator: 'v0.dev'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const currentUser = await getCurrentUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {currentUser ? (
            // Authenticated user - show full app layout
            <div className="flex min-h-screen w-full flex-col">
              <Header user={currentUser} />
              <div className="flex flex-1">
                <Sidebar userRole={currentUser.role} />
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">{children}</main>
              </div>
            </div>
          ) : (
            // No authenticated user - show login page or public content
            children
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}
