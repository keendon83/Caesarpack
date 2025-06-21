"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getDatabaseStatus, initializeDatabase } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Database, CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface DatabaseStatus {
  connected: boolean
  error?: string
  tables: Array<{
    table_name: string
    table_type: string
    row_count: number | string
  }>
  types: Array<{
    type_name: string
    type_type: string
  }>
  connection_test: boolean
}

export default function DatabasePage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const { toast } = useToast()

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const dbStatus = await getDatabaseStatus()
      setStatus(dbStatus)
    } catch (error) {
      console.error("Error fetching database status:", error)
      setStatus({
        connected: false,
        error: "Failed to fetch database status",
        tables: [],
        types: [],
        connection_test: false,
      })
    }
    setLoading(false)
  }

  const handleInitializeDatabase = async () => {
    setInitializing(true)
    try {
      const result = await initializeDatabase()
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Database initialized successfully!",
        })
        // Refresh status after initialization
        await fetchStatus()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize database",
        variant: "destructive",
      })
    }
    setInitializing(false)
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading database status...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Database Status
        </h1>
        <div className="flex gap-2">
          <Button onClick={fetchStatus} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleInitializeDatabase} disabled={initializing}>
            {initializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Initialize Database
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.connected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant={status?.connected ? "default" : "destructive"}>
                {status?.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Connection Test:</span>
              <Badge variant={status?.connection_test ? "default" : "destructive"}>
                {status?.connection_test ? "Passed" : "Failed"}
              </Badge>
            </div>
            {status?.error && (
              <div className="text-red-500 text-sm">
                <span className="font-medium">Error:</span> {status.error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Database Tables</CardTitle>
        </CardHeader>
        <CardContent>
          {status?.tables && status.tables.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Row Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.tables.map((table) => (
                    <TableRow key={table.table_name}>
                      <TableCell className="font-medium">{table.table_name}</TableCell>
                      <TableCell>{table.table_type}</TableCell>
                      <TableCell>
                        {typeof table.row_count === "number" ? (
                          <Badge variant="outline">{table.row_count.toLocaleString()}</Badge>
                        ) : (
                          <Badge variant="destructive">{table.row_count}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No tables found in the database.</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Types */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Types (Enums)</CardTitle>
        </CardHeader>
        <CardContent>
          {status?.types && status.types.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Type Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.types.map((type) => (
                    <TableRow key={type.type_name}>
                      <TableCell className="font-medium">{type.type_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{type.type_type === "e" ? "Enum" : type.type_type}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No custom types found in the database.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
