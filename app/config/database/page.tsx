"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  ArrowLeft,
  Play,
  Settings,
} from "lucide-react"
import Link from "next/link"

interface DatabaseStatus {
  healthy: boolean
  message: string
  connected?: boolean
}

export default function DatabaseConfigPage() {
  const [databaseUrl, setDatabaseUrl] = useState("")
  const [jwtSecret, setJwtSecret] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningSetup, setRunningSetup] = useState(false)
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    checkCurrentStatus()
    generateJwtSecret()
  }, [])

  const checkCurrentStatus = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch("/api/admin/health", {
        signal: controller.signal,
        cache: "no-cache",
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        setStatus({
          healthy: false,
          message: "Health check failed. Running in demo mode.",
        })
      }
    } catch (error) {
      console.error("Failed to check status:", error)
      setStatus({
        healthy: false,
        message: "Cannot connect to health check. Running in demo mode.",
      })
    }
  }

  const generateJwtSecret = () => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    setJwtSecret(secret)
  }

  const testConnection = async () => {
    if (!databaseUrl.trim()) {
      setError("Please enter a database URL")
      return
    }

    setTesting(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/config/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ databaseUrl: databaseUrl.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("✅ Database connection successful!")
        setStatus({ healthy: true, message: "Connection test passed", connected: true })
      } else {
        setError(data.error || "Connection test failed")
        setStatus({ healthy: false, message: data.error || "Connection failed", connected: false })
      }
    } catch (error) {
      setError("Network error during connection test")
      setStatus({ healthy: false, message: "Network error", connected: false })
    } finally {
      setTesting(false)
    }
  }

  const saveConfiguration = async () => {
    if (!databaseUrl.trim()) {
      setError("Please enter a database URL")
      return
    }

    if (!jwtSecret.trim()) {
      setError("Please generate a JWT secret")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/config/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          databaseUrl: databaseUrl.trim(),
          jwtSecret: jwtSecret.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("✅ Configuration saved! Please redeploy your application to apply changes.")
      } else {
        setError(data.error || "Failed to save configuration")
      }
    } catch (error) {
      setError("Network error while saving configuration")
    } finally {
      setSaving(false)
    }
  }

  const runDatabaseSetup = async () => {
    if (!status?.connected) {
      setError("Please test the database connection first")
      return
    }

    setRunningSetup(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/config/setup-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ databaseUrl: databaseUrl.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("✅ Database setup completed! Tables and demo data created successfully.")
        await checkCurrentStatus()
      } else {
        setError(data.error || "Database setup failed")
      }
    } catch (error) {
      setError("Network error during database setup")
    } finally {
      setRunningSetup(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess("Copied to clipboard!")
    setTimeout(() => setSuccess(""), 2000)
  }

  const sampleUrl = "postgresql://username:password@host:port/database?sslmode=require"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Database Configuration</h1>
              <p className="text-sm text-gray-600">Configure your Neon PostgreSQL connection</p>
            </div>
            <Link href="/login">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Current Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {status.healthy ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  )}
                  <div>
                    <p className="font-medium">{status.healthy ? "Database Connected" : "Database Not Connected"}</p>
                    <p className="text-sm text-gray-600">{status.message}</p>
                  </div>
                </div>
                <Badge variant={status.healthy ? "default" : "secondary"}>
                  {status.healthy ? "Connected" : "Demo Mode"}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p>Checking database status...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Database Configuration</CardTitle>
            <CardDescription>Enter your Neon PostgreSQL connection string and configure JWT secret</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Database URL */}
            <div className="space-y-2">
              <Label htmlFor="databaseUrl">Database URL *</Label>
              <div className="relative">
                <Input
                  id="databaseUrl"
                  type={showPassword ? "text" : "password"}
                  value={databaseUrl}
                  onChange={(e) => setDatabaseUrl(e.target.value)}
                  placeholder={sampleUrl}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 p-0"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {databaseUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(databaseUrl)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Get this from your Neon dashboard → Connection Details → Connection string
              </p>
            </div>

            {/* JWT Secret */}
            <div className="space-y-2">
              <Label htmlFor="jwtSecret">JWT Secret *</Label>
              <div className="flex space-x-2">
                <Input
                  id="jwtSecret"
                  type="password"
                  value={jwtSecret}
                  onChange={(e) => setJwtSecret(e.target.value)}
                  placeholder="Auto-generated secure secret"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={generateJwtSecret} className="shrink-0">
                  Generate New
                </Button>
              </div>
              <p className="text-xs text-gray-500">Used for securing authentication tokens. Keep this secret safe.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={testConnection} disabled={testing || !databaseUrl.trim()} variant="outline">
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Database className="mr-2 h-4 w-4" />
                Test Connection
              </Button>

              <Button onClick={saveConfiguration} disabled={saving || !databaseUrl.trim() || !jwtSecret.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Settings className="mr-2 h-4 w-4" />
                Save Configuration
              </Button>

              <Button onClick={runDatabaseSetup} disabled={runningSetup || !status?.connected} variant="default">
                {runningSetup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Play className="mr-2 h-4 w-4" />
                Setup Database
              </Button>
            </div>

            {/* Status Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Get your Neon connection string</h4>
                  <p className="text-sm text-gray-600">
                    Go to your Neon dashboard → Select your database → Connection Details → Copy the connection string
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Paste and test connection</h4>
                  <p className="text-sm text-gray-600">
                    Paste your connection string above and click "Test Connection" to verify it works
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Save configuration</h4>
                  <p className="text-sm text-gray-600">
                    Click "Save Configuration" to store your settings (you'll need to redeploy if using Vercel)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-medium">Setup database tables</h4>
                  <p className="text-sm text-gray-600">
                    Click "Setup Database" to create all necessary tables and demo data
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your connection string contains sensitive information - keep it secure</li>
                <li>• The JWT secret is auto-generated for security</li>
                <li>• After saving, you may need to redeploy your application</li>
                <li>• The database setup creates demo users with password: demo123</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
