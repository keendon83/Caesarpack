"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, FileText, Database, ArrowLeft, Trash2, Edit, Plus, CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface User {
  user_id: number
  full_name: string
  username: string
  role: string
  designation: string
  company: string
  created_at: string
}

interface Form {
  form_id: number
  title: string
  status: string
  created_at: string
  creator_name: string
}

interface DatabaseHealth {
  healthy: boolean
  message: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const [usersRes, formsRes, healthRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/forms"),
        fetch("/api/admin/health"),
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users)
      }

      if (formsRes.ok) {
        const formsData = await formsRes.json()
        setForms(formsData.forms)
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setDbHealth(healthData)
      }
    } catch (error) {
      console.error("Error fetching admin data:", error)
      setError("Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteForm = async (formId: number) => {
    if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/forms/${formId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setForms(forms.filter((f) => f.form_id !== formId))
      } else {
        setError("Failed to delete form")
      }
    } catch (error) {
      setError("Network error while deleting form")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600">Manage users, forms, and system settings</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{forms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed Forms</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {forms.filter((f) => f.status === "completed").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Database className={`h-8 w-8 ${dbHealth?.healthy ? "text-green-600" : "text-red-600"}`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Database</p>
                  <p className={`text-lg font-bold ${dbHealth?.healthy ? "text-green-600" : "text-red-600"}`}>
                    {dbHealth?.healthy ? "Healthy" : "Error"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="forms">Form Management</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and permissions</CardDescription>
                  </div>
                  <Link href="/admin/users/create">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{user.full_name}</h3>
                        <p className="text-sm text-gray-600">
                          @{user.username} • {user.designation} • {user.company}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                          <span className="text-xs text-gray-500">
                            Created {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/admin/users/${user.user_id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {user.user_id !== 1 && ( // Don't allow deleting admin user
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Form Management</CardTitle>
                <CardDescription>View and manage all forms in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forms.map((form) => (
                    <div key={form.form_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{form.title}</h3>
                        <p className="text-sm text-gray-600">
                          Created by {form.creator_name} on {new Date(form.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(form.status)}
                        <Link href={`/forms/${form.form_id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {form.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteForm(form.form_id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Monitor database connection and system status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className={`h-6 w-6 ${dbHealth?.healthy ? "text-green-600" : "text-red-600"}`} />
                      <div>
                        <h3 className="font-semibold">Database Connection</h3>
                        <p className="text-sm text-gray-600">{dbHealth?.message}</p>
                      </div>
                    </div>
                    <Badge variant={dbHealth?.healthy ? "default" : "destructive"}>
                      {dbHealth?.healthy ? "Healthy" : "Error"}
                    </Badge>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">System Information</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>Environment: {process.env.NODE_ENV || "development"}</div>
                      <div>Database: Neon PostgreSQL</div>
                      <div>Framework: Next.js 14</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
