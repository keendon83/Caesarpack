"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Wrench, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface DiagnosticResult {
  success: boolean
  message: string
  version?: string
  details?: string
  suggestion?: string
}

export default function DiagnosticsPage() {
  const [databaseUrl, setDatabaseUrl] = useState("")
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)

  const runDiagnostics = async () => {
    if (!databaseUrl.trim()) {
      setResult({
        success: false,
        message: "Please enter a database URL to test.",
      })
      return
    }

    setTesting(true)
    setResult(null)

    try {
      const response = await fetch("/api/config/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: databaseUrl.trim() }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "A network error occurred while running diagnostics.",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/login">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Database Connection Diagnostics</CardTitle>
            <CardDescription>
              Test your Neon PostgreSQL connection string to identify and resolve issues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="databaseUrl">Database URL to Test</Label>
              <Input
                id="databaseUrl"
                type="text"
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                placeholder="postgresql://user:password@host/db?sslmode=require"
              />
            </div>
            <Button onClick={runDiagnostics} disabled={testing}>
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Wrench className="mr-2 h-4 w-4" />
              Run Diagnostics
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <AlertDescription>
                  <p className="font-bold">{result.message}</p>
                  {result.version && <p>PostgreSQL Version: {result.version}</p>}
                  {result.details && <p className="text-xs mt-2">Details: {result.details}</p>}
                  {result.suggestion && <p className="mt-2 font-semibold">Suggestion: {result.suggestion}</p>}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-gray-700">
            <p>
              <strong>1. Check your Neon Dashboard:</strong> Ensure your project is active and not suspended.
            </p>
            <p>
              <strong>2. Use the correct Connection String:</strong> Neon provides multiple. Try both the "Pooled" and
              "Non-pooled" (direct) connection strings. The non-pooled one is often more reliable for testing.
            </p>
            <p>
              <strong>3. Verify your Password:</strong> Make sure the password in the URL is correct and doesn't contain
              special characters that need to be URL-encoded.
            </p>
            <p>
              <strong>4. Vercel Integration:</strong> If you've installed the Neon integration on Vercel, the connection
              string is automatically added to your environment variables. Ensure your project is redeployed after
              adding the integration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
