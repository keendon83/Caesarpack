"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface Department {
  department_id: number
  name: string
}

interface User {
  user_id: number
  full_name: string
  designation: string
}

export default function CreateFormPage() {
  const [formData, setFormData] = useState({
    customerName: "",
    jobCardNumber: "",
    invoiceNumber: "",
    orderDate: "",
    deliveryDate: "",
    quantityDelivered: "",
    quantityReturned: "",
    totalAmount: "",
    totalDiscount: "",
    complaintDescription: "",
    qualityIssues: [] as string[],
    responsibleDepartments: [] as number[],
  })

  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [deptRes, usersRes] = await Promise.all([fetch("/api/departments"), fetch("/api/users")])

      if (deptRes.ok) {
        const deptData = await deptRes.json()
        setDepartments(deptData.departments)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users.filter((u: User) => u.user_id !== 1)) // Exclude current user
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const qualityIssueOptions = [
    "Quality",
    "Wrong Size",
    "Damaged Sheets",
    "Wet Sheets",
    "Above Tolerance",
    "Printing Problems",
    "Others",
  ]

  const handleQualityIssueChange = (issue: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        qualityIssues: [...prev.qualityIssues, issue],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        qualityIssues: prev.qualityIssues.filter((i) => i !== issue),
      }))
    }
  }

  const handleDepartmentChange = (deptId: number, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        responsibleDepartments: [...prev.responsibleDepartments, deptId],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        responsibleDepartments: prev.responsibleDepartments.filter((id) => id !== deptId),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Calculate rejection amount per department
      const totalDiscount = Number.parseFloat(formData.totalDiscount) || 0
      const rejectionAmountPerDept =
        formData.responsibleDepartments.length > 0 ? totalDiscount / formData.responsibleDepartments.length : 0

      // Default workflow: NRA → RAS → HOZ → MDA
      const workflowUsers = [
        { userId: 6, sequenceOrder: 1 }, // NRA
        { userId: 3, sequenceOrder: 2 }, // RAS (Sales Director)
        { userId: 4, sequenceOrder: 3 }, // HOZ (CEO)
        { userId: 5, sequenceOrder: 4 }, // MDA (Finance)
      ]

      const response = await fetch("/api/forms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Customer Rejection - ${formData.customerName}`,
          formData,
          workflowUsers,
          departmentAmounts: formData.responsibleDepartments.map((deptId) => ({
            departmentId: deptId,
            rejectionAmount: rejectionAmountPerDept,
          })),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/dashboard")
      } else {
        setError(data.error || "Failed to create form")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Complaint / Rejected Order</CardTitle>
            <CardDescription>Create a new customer rejection form for approval workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobCardNumber">Job Card Number</Label>
                  <Input
                    id="jobCardNumber"
                    value={formData.jobCardNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, jobCardNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantityDelivered">Quantity Delivered</Label>
                  <Input
                    id="quantityDelivered"
                    type="number"
                    value={formData.quantityDelivered}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantityDelivered: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantityReturned">Quantity Returned</Label>
                  <Input
                    id="quantityReturned"
                    type="number"
                    value={formData.quantityReturned}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantityReturned: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (IQD)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, totalAmount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalDiscount">Total Discount (IQD) *</Label>
                  <Input
                    id="totalDiscount"
                    type="number"
                    step="0.01"
                    value={formData.totalDiscount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, totalDiscount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Complaint Description */}
              <div className="space-y-2">
                <Label htmlFor="complaintDescription">Complaint / Rejection Description *</Label>
                <Textarea
                  id="complaintDescription"
                  value={formData.complaintDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, complaintDescription: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              {/* Quality Issues */}
              <div className="space-y-3">
                <Label>Cause of Complaint/Rejection</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {qualityIssueOptions.map((issue) => (
                    <div key={issue} className="flex items-center space-x-2">
                      <Checkbox
                        id={`quality-${issue}`}
                        checked={formData.qualityIssues.includes(issue)}
                        onCheckedChange={(checked) => handleQualityIssueChange(issue, checked as boolean)}
                      />
                      <Label htmlFor={`quality-${issue}`} className="text-sm">
                        {issue}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsible Departments */}
              <div className="space-y-3">
                <Label>Responsible Department(s) *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {departments.map((dept) => (
                    <div key={dept.department_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dept-${dept.department_id}`}
                        checked={formData.responsibleDepartments.includes(dept.department_id)}
                        onCheckedChange={(checked) => handleDepartmentChange(dept.department_id, checked as boolean)}
                      />
                      <Label htmlFor={`dept-${dept.department_id}`} className="text-sm">
                        {dept.name}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.responsibleDepartments.length > 0 && formData.totalDiscount && (
                  <p className="text-sm text-gray-600">
                    Rejection amount per department:{" "}
                    <strong>
                      {(
                        Number.parseFloat(formData.totalDiscount) / formData.responsibleDepartments.length
                      ).toLocaleString()}{" "}
                      IQD
                    </strong>
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4">
                <Link href="/dashboard">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
