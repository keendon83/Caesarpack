"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { AuthenticatedSignaturePad } from "@/components/authenticated-signature-pad"
import { CompanyLogo } from "@/components/company-logo"
import { Loader2, Download, Lock, Unlock, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  submitCustomerRejectionForm,
  signCustomerRejectionForm,
  unlockCustomerRejectionForm,
  deleteCustomerRejectionFormSubmission,
  updateCustomerRejectionFormSubmission,
} from "@/app/actions"
import { useRouter } from "next/navigation"
import { downloadCustomerRejectionPDF } from "@/lib/pdf-generator"

interface CustomerRejectionFormProps {
  initialData?: any
  submissionId?: string
  currentUser: any
  readOnly?: boolean
}

const causeOfComplaintOptions = [
  "Quality",
  "Wrong Size",
  "Damaged Sheets",
  "Wet Sheets",
  "Above Tolerance",
  "Printing Problems",
  "Others",
]

const responsibleDepartmentOptions = [
  "Converting",
  "Corrugator",
  "Pre-Production",
  "Ink",
  "Quality",
  "Sales",
  "Design",
  "Packing",
  "Logistics/Shipping",
]

export function CustomerRejectionForm({
  initialData,
  submissionId,
  currentUser,
  readOnly: propReadOnly = false,
}: CustomerRejectionFormProps) {
  // Initialize with empty object to prevent undefined access
  const [formData, setFormData] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [authenticatedSigner, setAuthenticatedSigner] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false) // Only show loading for existing forms
  const { toast } = useToast()
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  const canSign = currentUser?.role === "admin" || currentUser?.role === "ceo"
  const canEdit = !isLocked || (canSign && isEditing)
  const currentCompany = currentUser?.company || "Caesarpack Holdings"

  // Only run initialization effect for existing submissions
  useEffect(() => {
    if (initialData) {
      setIsLoading(true)
      const initializeForm = async () => {
        try {
          if (initialData?.submission_data) {
            setFormData(initialData.submission_data)
            setIsLocked(initialData.is_signed || false)
          }
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          console.error("Error initializing form:", error)
        } finally {
          setIsLoading(false)
        }
      }
      initializeForm()
    }
  }, [initialData])

  // Early return if no current user
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Authentication required</p>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </div>
      </div>
    )
  }

  // Show loading only for existing forms
  if (isLoading && initialData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (group: string, option: string, checked: boolean) => {
    setFormData((prev: any) => {
      const currentGroup = prev[group] || []
      if (checked) {
        return { ...prev, [group]: [...currentGroup, option] }
      } else {
        return { ...prev, [group]: currentGroup.filter((item: string) => item !== option) }
      }
    })
  }

  const handleSignatureSave = (dataUrl: string) => {
    setFormData((prev: any) => ({ ...prev, signature: dataUrl }))
  }

  const handleAuthSuccess = (user: any) => {
    setAuthenticatedSigner(user)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let result
      if (submissionId && isEditing) {
        result = await updateCustomerRejectionFormSubmission(submissionId, formData)
      } else {
        result = await submitCustomerRejectionForm(formData)
      }

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: `Form ${submissionId ? "updated" : "submitted"} successfully.`,
        })
        if (!submissionId && result.data?.id) {
          router.push(`/forms/customer-rejection/${result.data.id}`)
        } else if (submissionId) {
          setIsEditing(false)
          router.refresh()
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while submitting the form.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignForm = async () => {
    if (!formData.signature) {
      toast({
        title: "Error",
        description: "Please provide a signature before signing.",
        variant: "destructive",
      })
      return
    }
    if (!submissionId) {
      toast({
        title: "Error",
        description: "Form must be submitted before it can be signed.",
        variant: "destructive",
      })
      return
    }
    if (!authenticatedSigner) {
      toast({
        title: "Error",
        description: "Please authenticate before signing.",
        variant: "destructive",
      })
      return
    }

    setIsSigning(true)
    try {
      const result = await signCustomerRejectionForm(submissionId, formData.signature, authenticatedSigner.id)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: result.message || "Form signed successfully!",
        })
        setIsLocked(true)
        router.refresh()
        await generateUnifiedPdf()
      }
    } catch (error) {
      console.error("Error signing form:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while signing the form.",
        variant: "destructive",
      })
    } finally {
      setIsSigning(false)
    }
  }

  const handleUnlockForm = async () => {
    if (!submissionId) return
    if (!window.confirm("Are you sure you want to unlock this form? This will remove the signature and PDF.")) {
      return
    }

    setIsUnlocking(true)
    try {
      const result = await unlockCustomerRejectionForm(submissionId)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Form unlocked successfully.",
        })
        setIsLocked(false)
        setIsEditing(true)
        setAuthenticatedSigner(null)
        router.refresh()
      }
    } catch (error) {
      console.error("Error unlocking form:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while unlocking the form.",
        variant: "destructive",
      })
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleDeleteForm = async () => {
    if (!submissionId) return
    if (!window.confirm("Are you sure you want to delete this form submission? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteCustomerRejectionFormSubmission(submissionId)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Form submission deleted.",
        })
        router.push("/forms/customer-rejection")
      }
    } catch (error) {
      console.error("Error deleting form:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the form.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const generateUnifiedPdf = async () => {
    if (!submissionId) return

    setIsGeneratingPdf(true)
    toast({
      title: "Generating PDF",
      description: "Please wait while the PDF is being generated...",
      duration: 3000,
    })

    try {
      const submissionForPdf = {
        id: submissionId,
        submission_data: formData,
        company: currentUser.company,
        is_signed: isLocked,
        signed_at: initialData?.signed_at,
        signed_by_user_full_name: initialData?.signed_by_user?.full_name || authenticatedSigner?.full_name,
        users: { full_name: currentUser.full_name },
        created_at: initialData?.created_at || new Date().toISOString(),
      }

      const filename = downloadCustomerRejectionPDF(submissionForPdf)

      toast({
        title: "PDF Generated Successfully",
        description: `The PDF has been downloaded as ${filename}`,
      })
    } catch (error: any) {
      console.error("Error generating PDF:", error)
      toast({
        title: "PDF Generation Failed",
        description: error.message || "An unexpected error occurred during PDF generation.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const getFormCode = () => {
    return currentCompany === "Caesarpac Iraq" ? "BAK-RJ-01" : "CP-RJ-01"
  }

  const getCompanyDisplayName = () => {
    return currentCompany === "Caesarpac Iraq" ? "Balad Al Khair For Carton Products" : currentCompany
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <CompanyLogo companyName={currentCompany} className="h-12 w-auto" />
          <div>
            <CardTitle className="text-2xl">Customer Complaint / Rejected Order</CardTitle>
            <p className="text-sm text-muted-foreground">{getFormCode()}</p>
            {currentCompany === "Caesarpac Iraq" && (
              <p className="text-xs text-muted-foreground">{getCompanyDisplayName()}</p>
            )}
          </div>
        </div>
        {submissionId && (
          <div className="flex gap-2">
            {isLocked && (
              <Button onClick={generateUnifiedPdf} disabled={isGeneratingPdf} variant="outline">
                {isGeneratingPdf && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                {isGeneratingPdf ? "Generating..." : "Download PDF"}
              </Button>
            )}
            {canSign && isLocked && (
              <>
                <Button onClick={() => setIsEditing(true)} disabled={isEditing}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" onClick={handleUnlockForm} disabled={isUnlocking}>
                  {isUnlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Unlock className="mr-2 h-4 w-4" /> Unlock
                </Button>
              </>
            )}
            {canSign && (
              <Button variant="destructive" onClick={handleDeleteForm} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 relative" ref={formRef}>
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-8xl font-bold text-gray-200 rotate-[-45deg] select-none">LOCKED</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                value={formData.issueDate || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                required
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                required
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Customer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name / إسم العمیل</Label>
              <Input
                id="customerName"
                name="customerName"
                value={formData.customerName || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                required
              />
            </div>
            <div>
              <Label htmlFor="jobCardNb">Job Card Nb. / رقم أمر العمل</Label>
              <Input
                id="jobCardNb"
                name="jobCardNb"
                value={formData.jobCardNb || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="invoiceNb">Invoice Nb. / رقم الفاتورة</Label>
              <Input
                id="invoiceNb"
                name="invoiceNb"
                value={formData.invoiceNb || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="dateOfOrder">Date of Order / تاريخ الطلب</Label>
              <Input
                id="dateOfOrder"
                name="dateOfOrder"
                type="date"
                value={formData.dateOfOrder || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="deliveryDate">Delivery Date / تاريخ التوصيل</Label>
              <Input
                id="deliveryDate"
                name="deliveryDate"
                type="date"
                value={formData.deliveryDate || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantityDelivered">Quantity Delivered / الكمية المرسلة</Label>
              <Input
                id="quantityDelivered"
                name="quantityDelivered"
                type="number"
                value={formData.quantityDelivered || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="quantityReturned">Quantity Returned / الكمية المرتجعة</Label>
              <Input
                id="quantityReturned"
                name="quantityReturned"
                type="number"
                value={formData.quantityReturned || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="totalAmount">Total Amount (IQD) / المبلغ الإجمالي</Label>
              <Input
                id="totalAmount"
                name="totalAmount"
                type="number"
                value={formData.totalAmount || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="totalDiscount">Total Discount (IQD) / اجمالي الخصم</Label>
              <Input
                id="totalDiscount"
                name="totalDiscount"
                type="number"
                value={formData.totalDiscount || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Complaint / Rejection Description</h3>
          <Textarea
            id="complaintDescription"
            name="complaintDescription"
            value={formData.complaintDescription || ""}
            onChange={handleInputChange}
            readOnly={!canEdit}
            rows={4}
            required
          />

          <h3 className="text-lg font-semibold mt-6 mb-2">Cause of Complaint/Rejection</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {causeOfComplaintOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`cause-${option}`}
                  checked={formData.causeOfComplaint?.includes(option) || false}
                  onCheckedChange={(checked) => handleCheckboxChange("causeOfComplaint", option, checked === true)}
                  disabled={!canEdit}
                />
                <Label htmlFor={`cause-${option}`}>{option}</Label>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Responsible Department</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {responsibleDepartmentOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`responsible-${option}`}
                  checked={formData.responsibleDepartment?.includes(option) || false}
                  onCheckedChange={(checked) => handleCheckboxChange("responsibleDepartment", option, checked === true)}
                  disabled={!canEdit}
                />
                <Label htmlFor={`responsible-${option}`}>{option}</Label>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">Management Decision</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="decisionConverting">Converting</Label>
              <Textarea
                id="decisionConverting"
                name="decisionConverting"
                value={formData.decisionConverting || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="decisionCorrugator">Corrugator</Label>
              <Textarea
                id="decisionCorrugator"
                name="decisionCorrugator"
                value={formData.decisionCorrugator || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="decisionSales">Sales</Label>
              <Textarea
                id="decisionSales"
                name="decisionSales"
                value={formData.decisionSales || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="decisionLogistics">Logistics</Label>
              <Textarea
                id="decisionLogistics"
                name="decisionLogistics"
                value={formData.decisionLogistics || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="decisionPreProduction">Pre-Production</Label>
              <Textarea
                id="decisionPreProduction"
                name="decisionPreProduction"
                value={formData.decisionPreProduction || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="decisionFinance">Finance</Label>
              <Textarea
                id="decisionFinance"
                name="decisionFinance"
                value={formData.decisionFinance || ""}
                onChange={handleInputChange}
                readOnly={!canEdit}
                rows={2}
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-6 mb-2">CEO Approval</h3>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Authentication Required:</strong> Only CEOs and administrators can sign this form. The CEO can
              sign from any user account by authenticating with their own credentials.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <AuthenticatedSignaturePad
              onSave={handleSignatureSave}
              onAuthSuccess={handleAuthSuccess}
              initialSignature={formData.signature}
              readOnly={propReadOnly}
              isLocked={isLocked}
              signedByUser={initialData?.signed_by_user}
              signedAt={initialData?.signed_at}
              className="border border-gray-300 rounded-md"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {submissionId ? (
            <>
              {canEdit && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Save Changes" : "Submit Update"}
                </Button>
              )}
              {!isLocked && (
                <Button onClick={handleSignForm} disabled={isSigning || !formData.signature || !authenticatedSigner}>
                  {isSigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Lock className="mr-2 h-4 w-4" /> Sign Form
                </Button>
              )}
            </>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit New Form
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
