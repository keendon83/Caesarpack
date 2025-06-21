"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { debugFormSubmissions, cleanupDuplicateSubmissions, removeAllDuplicateSubmissions } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Trash2, AlertTriangle } from "lucide-react"

export default function DebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const { toast } = useToast()

  const handleDebug = async () => {
    setLoading(true)
    try {
      const result = await debugFormSubmissions()
      setDebugData(result)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to debug submissions",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleCleanup = async () => {
    if (!window.confirm("Are you sure you want to clean up duplicate submissions? This action cannot be undone.")) {
      return
    }

    setCleaning(true)
    try {
      const result = await cleanupDuplicateSubmissions()
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: `Cleaned up ${result.deletedCount} duplicate submissions.`,
        })
        // Refresh debug data
        await handleDebug()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cleanup duplicates",
        variant: "destructive",
      })
    }
    setCleaning(false)
  }

  const handleRemoveAllDuplicates = async () => {
    if (
      !window.confirm(
        "Are you sure you want to remove ALL duplicate submissions? This will keep only the oldest submission for each unique serial number + customer name combination.",
      )
    ) {
      return
    }

    setCleaning(true)
    try {
      const result = await removeAllDuplicateSubmissions()
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: result.message,
        })
        // Refresh debug data
        await handleDebug()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove duplicates",
        variant: "destructive",
      })
    }
    setCleaning(false)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          Debug Form Submissions
        </h1>
        <div className="flex gap-2">
          <Button onClick={handleDebug} disabled={loading} variant="outline">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            Investigate
          </Button>
          <Button onClick={handleCleanup} disabled={cleaning} variant="destructive">
            {cleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Clean Duplicates
          </Button>
          <Button onClick={handleRemoveAllDuplicates} disabled={cleaning} variant="destructive">
            {cleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Remove ALL Duplicates
          </Button>
        </div>
      </div>

      {debugData && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{debugData.total}</div>
                  <div className="text-sm text-muted-foreground">Total Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Object.keys(debugData.byUser || {}).length}</div>
                  <div className="text-sm text-muted-foreground">Users with Submissions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {debugData.submissions?.filter((s: any) => s.is_signed).length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Signed Forms</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions by User */}
          <Card>
            <CardHeader>
              <CardTitle>Submissions by User</CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.byUser &&
                Object.entries(debugData.byUser).map(([username, submissions]: [string, any]) => (
                  <div key={username} className="mb-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{username}</h3>
                      <Badge variant="outline">{submissions.length} submissions</Badge>
                    </div>
                    <div className="space-y-1">
                      {submissions.map((sub: any) => (
                        <div key={sub.id} className="text-sm flex items-center justify-between">
                          <span>
                            {sub.customer_name || "No Customer"} - {sub.serial_number || "No Serial"}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant={sub.is_signed ? "default" : "secondary"}>
                              {sub.is_signed ? "Signed" : "Unsigned"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(sub.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* All Submissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Signed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debugData.submissions?.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono text-xs">{sub.id.slice(0, 8)}...</TableCell>
                        <TableCell>{sub.username}</TableCell>
                        <TableCell>{sub.customer_name || "N/A"}</TableCell>
                        <TableCell>{sub.serial_number || "N/A"}</TableCell>
                        <TableCell>{new Date(sub.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={sub.is_signed ? "default" : "secondary"}>
                            {sub.is_signed ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
