"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle, Clock, Loader2 } from "lucide-react"
import Link from "next/link"

interface Form {
  form_id: number
  title: string
  form_data: any
  status: string
  created_at: string
  creator_name: string
}

interface WorkflowStep {
  workflow_id: number
  user_id: number
  sequence_order: number
  signed: boolean
  signed_at: string | null
  user_name: string
  designation: string
  updated_fields: any
}

export default function ApproveFormPage() {
  const [form, setForm] = useState<Form | null>(null)
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [updatedFields, setUpdatedFields] = useState<any>({})
  const [comments, setComments] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()
  const params = useParams()
  const formId = params.id as string

  useEffect(() => {
    fetchFormData()
  }, [formId])

  const fetchFormData = async () => {
    try {
      const [formRes, workflowRes, userRes] = await Promise.all([
        fetch(`/api/forms/${formId}`),
        fetch(`/api/forms/${formId}/workflow`),
        fetch("/api/auth/me"),
      ])

      if (formRes.ok) {
        const formData = await formRes.json()
        setForm(formData.form)

        // Initialize updated fields with current form data
        setUpdatedFields(formData.form.form_data)
      }

      if (workflowRes.ok) {
        const workflowData = await workflowRes.json()
        setWorkflow(workflowData.workflow)
      }

      if (userRes.ok) {
        const userData = await userRes.json()
        setCurrentUser(userData.user)
      }
    } catch (error) {
      console.error("Error fetching form data:", error)
      setError("Failed to load form data")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/forms/${formId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updatedFields,
          comments,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/dashboard")
      } else {
        setError(data.error || "Failed to approve form")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const canApprove = () => {
    if (!currentUser || !workflow.length) return false

    const currentStep = workflow.find((step) => step.user_id === currentUser.user_id && !step.signed)

    if (!currentStep) return false

    // Check if all previous steps are completed
    const previousSteps = workflow.filter((step) => step.sequence_order < currentStep.sequence_order)

    return previousSteps.every((step) => step.signed)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Form Not Found</h2>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
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

        <div className="space-y-6">
          {/* Form Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{form.title}</CardTitle>
                  <CardDescription>
                    Created by {form.creator_name} on {new Date(form.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={form.status === "completed" ? "default" : "secondary"}>{form.status}</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Workflow Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflow.map((step, index) => (
                  <div key={step.workflow_id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {step.signed ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Clock className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{step.user_name}</span>
                        <span className="text-sm text-gray-500">({step.designation})</span>
                        {step.user_id === currentUser?.user_id && !step.signed && (
                          <Badge variant="outline">Your Turn</Badge>
                        )}
                      </div>
                      {step.signed && step.signed_at && (
                        <p className="text-sm text-gray-600">Approved on {new Date(step.signed_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Form Data */}
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
              {canApprove() && <CardDescription>You can edit the form data before approving</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={updatedFields.customerName || ""}
                    onChange={(e) => setUpdatedFields((prev) => ({ ...prev, customerName: e.target.value }))}
                    disabled={!canApprove()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobCardNumber">Job Card Number</Label>
                  <Input
                    id="jobCardNumber"
                    value={updatedFields.jobCardNumber || ""}
                    onChange={(e) => setUpdatedFields((prev) => ({ ...prev, jobCardNumber: e.target.value }))}
                    disabled={!canApprove()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (IQD)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    value={updatedFields.totalAmount || ""}
                    onChange={(e) => setUpdatedFields((prev) => ({ ...prev, totalAmount: e.target.value }))}
                    disabled={!canApprove()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalDiscount">Total Discount (IQD)</Label>
                  <Input
                    id="totalDiscount"
                    type="number"
                    value={updatedFields.totalDiscount || ""}
                    onChange={(e) => setUpdatedFields((prev) => ({ ...prev, totalDiscount: e.target.value }))}
                    disabled={!canApprove()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaintDescription">Complaint Description</Label>
                <Textarea
                  id="complaintDescription"
                  value={updatedFields.complaintDescription || ""}
                  onChange={(e) => setUpdatedFields((prev) => ({ ...prev, complaintDescription: e.target.value }))}
                  disabled={!canApprove()}
                  rows={4}
                />
              </div>

              {updatedFields.qualityIssues && (
                <div className="space-y-2">
                  <Label>Quality Issues</Label>
                  <div className="flex flex-wrap gap-2">
                    {updatedFields.qualityIssues.map((issue: string) => (
                      <Badge key={issue} variant="outline">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {canApprove() && (
                <div className="space-y-2">
                  <Label htmlFor="comments">Approval Comments</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any comments or notes about your approval..."
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {canApprove() && (
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleApprove} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve & Sign
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
