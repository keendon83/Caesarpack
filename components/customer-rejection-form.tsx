"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { SignaturePad } from "@/components/signature-pad"
import { CompanyLogo } from "@/components/company-logo"
import { Loader2, Download, Lock, Unlock, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  submitCustomerRejectionForm,
  signCustomerRejectionForm,
  unlockCustomerRejectionForm,
  deleteCustomerRejectionFormSubmission,
  updateCustomerRejectionFormSubmission,
  uploadPdfToSupabase,
  updatePdfUrlInSubmission,
} from "@/app/actions"
import { useRouter } from "next/navigation"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface CustomerRejectionFormProps {
  initialData?: any // For editing/viewing existing submissions
  submissionId?: string // For existing submissions
  currentUser: any // Current authenticated user
  readOnly?: boolean // To control form editability
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
  const [formData, setFormData] = useState<any>(initialData || {})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isLocked, setIsLocked] = useState(initialData?.is_signed || false)
  const [isEditing, setIsEditing] = useState(false) // State for admin editing
  const { toast } = useToast()
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null) // Ref for the form content to be exported

  const isCEO = currentUser?.role === "admin"
  const canEdit = !isLocked || (isCEO && isEditing)
  const currentCompany = currentUser?.company || "Caesarpack Holdings" // Default for placeholder

  useEffect(() => {
    if (initialData) {
      setFormData(initialData.submission_data)
      setIsLocked(initialData.is_signed)
    }
  }, [initialData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (group: string, option: string, checked: boolean) => {
    setFormData((prev) => {
      const currentGroup = prev[group] || []
      if (checked) {
        return { ...prev, [group]: [...currentGroup, option] }
      } else {
        return { ...prev, [group]: currentGroup.filter((item: string) => item !== option) }
      }
    })
  }

  const handleSignatureSave = (dataUrl: string) => {
    setFormData((prev) => ({ ...prev, signature: dataUrl }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

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
      if (!submissionId) {
        router.push(`/forms/customer-rejection/${result.data.id}`)
      } else {
        setIsEditing(false) // Exit edit mode after saving
        router.refresh() // Revalidate data
      }
    }
    setIsSubmitting(false)
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

    setIsSigning(true)
    const result = await signCustomerRejectionForm(submissionId, formData.signature)
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Form signed successfully!",
      })
      setIsLocked(true)
      router.refresh()
      // Automatically generate PDF after signing
      await generateAndUploadPdf()
    }
    setIsSigning(false)
  }

  const handleUnlockForm = async () => {
    if (!submissionId) return
    if (!window.confirm("Are you sure you want to unlock this form? This will remove the signature and PDF.")) {
      return
    }

    setIsUnlocking(true)
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
      setIsEditing(true) // Enter edit mode after unlocking
      router.refresh()
    }
    setIsUnlocking(false)
  }

  const handleDeleteForm = async () => {
    if (!submissionId) return
    if (!window.confirm("Are you sure you want to delete this form submission? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
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
      router.push("/forms/customer-rejection") // Redirect to list
    }
    setIsDeleting(false)
  }

  const generateAndUploadPdf = async () => {
    if (!formRef.current || !submissionId) return

    setIsGeneratingPdf(true)
    toast({
      title: "Generating PDF",
      description: "Please wait while the PDF is being generated and uploaded...",
      duration: 5000,
    })

    // Temporarily add a "locked" watermark for PDF generation if signed
    const watermarkDiv = document.createElement("div")
    if (isLocked) {
      watermarkDiv.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px;
          color: rgba(0, 0, 0, 0.1);
          font-weight: bold;
          pointer-events: none;
          z-index: 1000;
          white-space: nowrap;
        ">LOCKED</div>
      `
      formRef.current.style.position = "relative" // Ensure watermark is positioned correctly
      formRef.current.appendChild(watermarkDiv)
    }

    try {
      const canvas = await html2canvas(formRef.current, {
        scale: 2, // Increase scale for better quality
        useCORS: true, // Important for images like company logo
        allowTaint: true, // Allow tainting for cross-origin images if necessary
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const pdfBlob = pdf.output("blob")
      const reader = new FileReader()
      reader.readAsDataURL(pdfBlob)
      reader.onloadend = async () => {
        const base64Pdf = reader.result as string
        const filename = `CP-RJ-01-${submissionId}.pdf`
        const uploadResult = await uploadPdfToSupabase(base64Pdf, filename)

        if (uploadResult.error) {
          toast({
            title: "PDF Upload Error",
            description: uploadResult.error,
            variant: "destructive",
          })
        } else if (uploadResult.publicUrl) {
          const updateResult = await updatePdfUrlInSubmission(submissionId, uploadResult.publicUrl)
          if (updateResult.error) {
            toast({
              title: "Database Update Error",
              description: updateResult.error,
              variant: "destructive",
            })
          } else {
            toast({
              title: "PDF Generated & Uploaded",
              description: "The PDF has been successfully generated and uploaded.",
            })
            router.refresh()
          }
        }
      }
    } catch (error: any) {
      console.error("Error generating or uploading PDF:", error)
      toast({
        title: "PDF Generation Failed",
        description: error.message || "An unexpected error occurred during PDF generation.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPdf(false)
      if (watermarkDiv.parentNode) {
        formRef.current?.removeChild(watermarkDiv) // Remove watermark after generation
        formRef.current!.style.position = "" // Reset position
      }
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <CompanyLogo companyName={currentCompany} className="h-12 w-auto" />
          <div>
            <CardTitle className="text-2xl">Customer Complaint / Rejected Order</CardTitle>
            <p className="text-sm text-muted-foreground">CP-RJ-01</p>
          </div>
        </div>
        {submissionId && (
          <div className="flex gap-2">
            {isLocked && initialData?.pdf_url && (
              <Button asChild variant="outline" disabled={isGeneratingPdf}>
                <a href={initialData.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </a>
              </Button>
            )}
            {isCEO && isLocked && (
              <>
                <Button onClick={() => setIsEditing(true)} disabled={isEditing}>
                  <Edit className="mr-2 h-4 w-4" /> Edit (Admin)
                </Button>
                <Button variant="outline" onClick={handleUnlockForm} disabled={isUnlocking}>
                  {isUnlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Unlock className="mr-2 h-4 w-4" /> Unlock
                </Button>
              </>
            )}
            {isCEO && (
              <Button variant="destructive" onClick={handleDeleteForm} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6" ref={formRef}>
          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
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

          <h3 className="text-lg font-semibold mt-6 mb-2">Customer's Details</h3>
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
          <div className="flex flex-col items-center gap-4">
            <SignaturePad
              onSave={handleSignatureSave}
              initialSignature={formData.signature}
              readOnly={isLocked || !isCEO} // Read-only if locked or not CEO
              className="border border-gray-300 rounded-md"
            />
            {isLocked && initialData?.signed_by_user?.full_name && (
              <p className="text-sm text-muted-foreground">
                Signed by: {initialData.signed_by_user.full_name} on {new Date(initialData.signed_at).toLocaleString()}
              </p>
            )}
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
              {!isLocked && isCEO && (
                <Button onClick={handleSignForm} disabled={isSigning || !formData.signature}>
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
