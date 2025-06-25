"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Clock, CheckCircle, AlertCircle, Plus, LogOut, Settings, DollarSign } from "lucide-react"
import Link from "next/link"

interface User {
  user_id: number
  full_name: string
  username: string
  role: string
  designation: string
  company: string
}

interface Form {
  form_id: number
  title: string
  form_data: any
  status: string
  created_at: string
  creator_name: string
}

interface RejectionAmount {
  department_name: string
  total_amount: number
  form_count: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [pendingForms, setPendingForms] = useState<Form[]>([])
  const [myForms, setMyForms] = useState<Form[]>([])
  const [rejectionAmounts, setRejectionAmounts] = useState<RejectionAmount[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [userRes, pendingRes, myFormsRes, rejectionRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/forms/pending"),
        fetch("/api/forms/my-forms"),
        fetch("/api/forms/rejection-amounts"),
      ])

      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData.user)
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json()
        setPendingForms(pendingData.forms)
      }

      if (myFormsRes.ok) {
        const myFormsData = await myFormsRes.json()
        setMyForms(myFormsData.forms)
      }

      if (rejectionRes.ok) {
        const rejectionData = await rejectionRes.json()
        setRejectionAmounts(rejectionData.amounts)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="default">
            <AlertCircle className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.full_name} ({user?.designation})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === "admin" && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingForms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">My Forms</p>
                  <p className="text-2xl font-bold text-gray-900">{myForms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {myForms.filter((f) => f.status === "completed").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Rejections</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {rejectionAmounts.reduce((sum, dept) => sum + dept.total_amount, 0).toLocaleString()} IQD
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pending" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
              <TabsTrigger value="my-forms">My Forms</TabsTrigger>
              <TabsTrigger value="rejections">Rejection Amounts</TabsTrigger>
            </TabsList>

            <Link href="/forms/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Form
              </Button>
            </Link>
          </div>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Forms Awaiting Your Approval</CardTitle>
                <CardDescription>Review and approve forms assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingForms.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No pending approvals</p>
                ) : (
                  <div className="space-y-4">
                    {pendingForms.map((form) => (
                      <div key={form.form_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{form.title}</h3>
                          <p className="text-sm text-gray-600">
                            Created by {form.creator_name} • {new Date(form.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(form.status)}
                          <Link href={`/forms/${form.form_id}/approve`}>
                            <Button size="sm">Review</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Submitted Forms</CardTitle>
                <CardDescription>Track the status of forms you've submitted</CardDescription>
              </CardHeader>
              <CardContent>
                {myForms.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No forms submitted yet</p>
                ) : (
                  <div className="space-y-4">
                    {myForms.map((form) => (
                      <div key={form.form_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{form.title}</h3>
                          <p className="text-sm text-gray-600">
                            Submitted on {new Date(form.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(form.status)}
                          <Link href={`/forms/${form.form_id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rejection Amounts by Department</CardTitle>
                <CardDescription>Total rejection amounts split across departments</CardDescription>
              </CardHeader>
              <CardContent>
                {rejectionAmounts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No rejection data available</p>
                ) : (
                  <div className="space-y-4">
                    {rejectionAmounts.map((dept) => (
                      <div
                        key={dept.department_name}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-semibold">{dept.department_name}</h3>
                          <p className="text-sm text-gray-600">
                            {dept.form_count} form{dept.form_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">{dept.total_amount.toLocaleString()} IQD</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
