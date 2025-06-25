"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building2, AlertTriangle, CheckCircle, Settings, Wrench, Database, RefreshCw } from "lucide-react"
import Link from "next/link"

interface DatabaseStatus {
  healthy: boolean
  message: string
  details?: string
  suggestion?: string
  version?: string
  debugInfo?: any
}

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false)
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkDatabaseStatus()
  }, [])

  useEffect(() => {
    if (!autoLoginAttempted && !statusLoading && dbStatus) {
      setAutoLoginAttempted(true)
      // Only auto-login if there are no critical errors
      setTimeout(() => {
        handleDemoLogin()
      }, 1500)
    }
  }, [autoLoginAttempted, statusLoading, dbStatus])

  const checkDatabaseStatus = async () => {
    setStatusLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      const response = await fetch("/api/admin/health", {
        cache: "no-store",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        setDbStatus(data)
        console.log("Health check result:", data)
      } else {
        throw new Error(`Health check returned ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error("Health check failed:", error)

      let errorMessage = "Health check failed"
      let suggestion = "Demo mode is still available"

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Health check timed out after 15 seconds"
          suggestion = "This indicates a serious connectivity issue. Try redeploying your application."
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Cannot reach health check API"
          suggestion = "There may be a deployment or network connectivity issue."
        }
      }

      setDbStatus({
        healthy: false,
        message: `${errorMessage}. Running in demo mode.`,
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: `${suggestion} You can still use the demo accounts below.`,
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/demo-login", { method: "POST" })
      if (response.ok) {
        router.push("/dashboard")
      } else {
        const data = await response.json().catch(() => ({ error: "Demo login failed" }))
        setError(data.error || "Auto-login failed. Please try logging in manually.")
        setLoading(false)
      }
    } catch (error) {
      console.error("Demo login error:", error)
      setError("Auto-login failed. You can still log in manually using the demo accounts below.")
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/dashboard")
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Network error during login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
    setError("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Form Approval System</CardTitle>
          <CardDescription>Sign in to your account to manage forms and approvals</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Database Status */}
          {statusLoading ? (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-800">
                Checking system status... This may take a moment for first connection.
              </AlertDescription>
            </Alert>
          ) : (
            dbStatus && (
              <Alert
                className={`mb-4 ${
                  dbStatus.healthy ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"
                }`}
              >
                {dbStatus.healthy ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Database className="h-4 w-4 text-orange-600" />
                )}
                <AlertDescription className={dbStatus.healthy ? "text-green-800" : "text-orange-800"}>
                  <div className="space-y-2">
                    <p className="font-semibold">{dbStatus.healthy ? "✅ Database Connected" : "⚠️ Demo Mode Active"}</p>
                    <p className="text-xs">{dbStatus.message}</p>

                    {dbStatus.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">Technical Details</summary>
                        <p className="mt-1 pl-2 border-l-2 border-orange-300 whitespace-pre-wrap">{dbStatus.details}</p>
                      </details>
                    )}

                    {dbStatus.suggestion && (
                      <div className="text-xs p-2 bg-orange-100 rounded">
                        <strong>Suggestion:</strong> {dbStatus.suggestion}
                      </div>
                    )}

                    {dbStatus.debugInfo && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium">Debug Information</summary>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {JSON.stringify(dbStatus.debugInfo, null, 2)}
                        </pre>
                      </details>
                    )}

                    {dbStatus.version && <p className="text-xs">Database: {dbStatus.version}</p>}

                    <div className="flex gap-2 mt-2">
                      <Button onClick={checkDatabaseStatus} size="sm" variant="outline" className="text-xs h-6">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry Check
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          {/* Configuration Tools */}
          <div className="mt-4 space-y-2">
            <Link href="/config/diagnostics">
              <Button variant="outline" className="w-full">
                <Wrench className="mr-2 h-4 w-4" />
                Database Diagnostics
              </Button>
            </Link>
            <Link href="/config/database">
              <Button variant="outline" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Configure Database
              </Button>
            </Link>
          </div>

          {/* Demo Accounts */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-sm text-blue-900 mb-3">🎯 Demo Accounts (Always Available)</h3>
            <p className="text-xs text-blue-700 mb-3">These accounts work regardless of database status:</p>
            <div className="space-y-2">
              {[
                { label: "Admin", user: "admin", desc: "Full system access" },
                { label: "Demo User", user: "demo", desc: "Regular employee" },
                { label: "Sales Director", user: "ras", desc: "Sales approval" },
                { label: "CEO", user: "hoz", desc: "Executive approval" },
                { label: "Finance", user: "mda", desc: "Financial approval" },
                { label: "NRA Officer", user: "nra", desc: "Initial review" },
              ].map(({ label, user, desc }) => (
                <button
                  key={user}
                  onClick={() => handleQuickLogin(user, "demo123")}
                  className="w-full text-left px-3 py-2 text-xs bg-white rounded border hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <strong>{label}:</strong> {user} / demo123
                    </div>
                    <span className="text-blue-600 text-xs">{desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
