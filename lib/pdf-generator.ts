import jsPDF from "jspdf"

interface FormSubmissionData {
  id: string
  submission_data: any
  company: string
  is_signed: boolean
  signed_at?: string
  signed_by_user_full_name?: string
  users?: { full_name: string }
  created_at: string
}

export function generateCustomerRejectionPDF(submission: FormSubmissionData): jsPDF {
  const pdf = new jsPDF("p", "mm", "a4")
  const pageWidth = 210
  const pageHeight = 297
  const margin = 20
  const contentWidth = pageWidth - 2 * margin

  const formData = submission.submission_data
  const customerName = formData?.customerName || "Unknown Customer"
  const serialNumber = formData?.serialNumber || "No Serial"
  const issueDate = formData?.issueDate || "No Date"
  const signedBy = submission.signed_by_user_full_name || "Unknown Signer"
  const signedAt = submission.signed_at ? new Date(submission.signed_at).toLocaleString() : "Unknown"
  const submittedBy = submission.users?.full_name || "Unknown"

  let yPosition = margin

  // Helper function to add text with automatic line wrapping
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 10
    const maxWidth = options.maxWidth || contentWidth
    const lineHeight = options.lineHeight || fontSize * 0.35

    pdf.setFontSize(fontSize)
    if (options.bold) pdf.setFont("helvetica", "bold")
    else pdf.setFont("helvetica", "normal")

    const lines = pdf.splitTextToSize(text, maxWidth)

    lines.forEach((line: string, index: number) => {
      pdf.text(line, x, y + index * lineHeight)
    })

    return y + lines.length * lineHeight
  }

  // Header - simple without logo
  pdf.setFillColor(240, 240, 240)
  pdf.rect(margin, yPosition, contentWidth, 25, "F")

  // Title and company info
  yPosition += 8
  addText("Customer Complaint / Rejected Order", margin + 10, yPosition, { fontSize: 16, bold: true })
  yPosition += 6

  // Form code based on company
  const formCode = submission.company === "Caesarpac Iraq" ? "BAK-RJ-01" : "CP-RJ-01"
  addText(formCode, margin + 10, yPosition, { fontSize: 10 })
  yPosition += 6

  // Company name with special handling for Caesarpac Iraq
  const companyDisplayName =
    submission.company === "Caesarpac Iraq" ? "Balad Al Khair For Carton Products" : submission.company
  addText(`Company: ${companyDisplayName}`, margin + 10, yPosition, { fontSize: 10 })
  yPosition += 10

  // Basic Information Section
  addText("BASIC INFORMATION", margin, yPosition, { fontSize: 12, bold: true })
  yPosition += 8

  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  // Two column layout for basic info
  const col1X = margin
  const col2X = margin + contentWidth / 2
  let col1Y = yPosition
  let col2Y = yPosition

  col1Y = addText(`Issue Date: ${issueDate}`, col1X, col1Y) + 3
  col2Y = addText(`Serial Number: ${serialNumber}`, col2X, col2Y) + 3

  yPosition = Math.max(col1Y, col2Y) + 5

  // Customer Details Section
  addText("CUSTOMER DETAILS", margin, yPosition, { fontSize: 12, bold: true })
  yPosition += 8

  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  // Customer details in two columns
  col1Y = yPosition
  col2Y = yPosition

  col1Y = addText(`Customer Name: ${formData?.customerName || "N/A"}`, col1X, col1Y) + 3
  col2Y = addText(`Job Card No.: ${formData?.jobCardNb || "N/A"}`, col2X, col2Y) + 3

  col1Y = addText(`Invoice No.: ${formData?.invoiceNb || "N/A"}`, col1X, col1Y) + 3
  col2Y = addText(`Date of Order: ${formData?.dateOfOrder || "N/A"}`, col2X, col2Y) + 3

  col1Y = addText(`Delivery Date: ${formData?.deliveryDate || "N/A"}`, col1X, col1Y) + 3
  col2Y = addText(`Quantity Delivered: ${formData?.quantityDelivered || "N/A"}`, col2X, col2Y) + 3

  col1Y = addText(`Quantity Returned: ${formData?.quantityReturned || "N/A"}`, col1X, col1Y) + 3
  col2Y = addText(`Total Amount (IQD): ${formData?.totalAmount || "N/A"}`, col2X, col2Y) + 3

  col1Y = addText(`Total Discount (IQD): ${formData?.totalDiscount || "N/A"}`, col1X, col1Y) + 3

  yPosition = Math.max(col1Y, col2Y) + 8

  // Complaint Description Section
  addText("COMPLAINT DESCRIPTION", margin, yPosition, { fontSize: 12, bold: true })
  yPosition += 8

  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  // Background for complaint description
  const complaintText = formData?.complaintDescription || "No description provided"
  pdf.setFillColor(249, 249, 249)
  const complaintHeight = Math.max(15, pdf.splitTextToSize(complaintText, contentWidth - 10).length * 3.5 + 6)
  pdf.rect(margin, yPosition, contentWidth, complaintHeight, "F")

  yPosition = addText(complaintText, margin + 5, yPosition + 4, { maxWidth: contentWidth - 10 }) + 8

  // Cause of Complaint Section
  addText("CAUSE OF COMPLAINT", margin, yPosition, { fontSize: 12, bold: true })
  yPosition += 8

  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  const causes = formData?.causeOfComplaint ? formData.causeOfComplaint.join(", ") : "None specified"
  yPosition = addText(causes, margin, yPosition) + 8

  // Responsible Department Section
  addText("RESPONSIBLE DEPARTMENT", margin, yPosition, { fontSize: 12, bold: true })
  yPosition += 8

  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  const departments = formData?.responsibleDepartment ? formData.responsibleDepartment.join(", ") : "None specified"
  yPosition = addText(departments, margin, yPosition) + 8

  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    pdf.addPage()
    yPosition = margin
  }

  // Management Decisions Section
  addText("MANAGEMENT DECISIONS", margin, yPosition, { fontSize: 12, bold: true })
  yPosition += 8

  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  // Management decisions in two columns
  col1Y = yPosition
  col2Y = yPosition

  const decisions = [
    { label: "Converting", value: formData?.decisionConverting },
    { label: "Corrugator", value: formData?.decisionCorrugator },
    { label: "Sales", value: formData?.decisionSales },
    { label: "Logistics", value: formData?.decisionLogistics },
    { label: "Pre-Production", value: formData?.decisionPreProduction },
    { label: "Finance", value: formData?.decisionFinance },
  ]

  decisions.forEach((decision, index) => {
    if (decision.value && decision.value.trim()) {
      const text = `${decision.label}: ${decision.value}`
      if (index % 2 === 0) {
        col1Y = addText(text, col1X, col1Y, { maxWidth: contentWidth / 2 - 10 }) + 3
      } else {
        col2Y = addText(text, col2X, col2Y, { maxWidth: contentWidth / 2 - 10 }) + 3
      }
    }
  })

  yPosition = Math.max(col1Y, col2Y) + 8

  // CEO Approval Section
  addText("CEO APPROVAL", margin, yPosition, { fontSize: 12, bold: true })
  yPosition += 8

  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  // Signature area
  if (formData?.signature && submission.is_signed) {
    try {
      // Add signature image
      pdf.addImage(formData.signature, "PNG", margin, yPosition, 60, 30)
      yPosition += 35
    } catch (error) {
      console.error("Error adding signature to PDF:", error)
      yPosition = addText("Digital signature present but could not be displayed", margin, yPosition) + 5
    }
  } else {
    yPosition = addText("No signature available", margin, yPosition) + 5
  }

  // Signature details
  if (submission.is_signed) {
    yPosition = addText(`Digitally signed by: ${signedBy}`, margin, yPosition, { fontSize: 9 }) + 3
    yPosition = addText(`Date & Time: ${signedAt}`, margin, yPosition, { fontSize: 9 }) + 3
    yPosition = addText("Authentication: Verified CEO/Admin credentials", margin, yPosition, { fontSize: 9 }) + 8
  }

  // Watermark for signed documents
  if (submission.is_signed) {
    pdf.setGState(new pdf.GState({ opacity: 0.1 }))
    pdf.setTextColor(0, 128, 0)
    pdf.setFontSize(60)
    pdf.setFont("helvetica", "bold")

    // Calculate center position and rotate
    const centerX = pageWidth / 2
    const centerY = pageHeight / 2

    pdf.text("SIGNED", centerX, centerY, {
      angle: -45,
      align: "center",
    })

    // Reset graphics state
    pdf.setGState(new pdf.GState({ opacity: 1 }))
    pdf.setTextColor(0, 0, 0)
  }

  // Footer
  yPosition = pageHeight - 30
  pdf.setDrawColor(200, 200, 200)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 5

  addText(`Generated on ${new Date().toLocaleString()}`, margin, yPosition, { fontSize: 8 })
  yPosition += 3
  addText(`Form submitted by: ${submittedBy}`, margin, yPosition, { fontSize: 8 })

  if (submission.is_signed && submission.signed_by_user_full_name) {
    yPosition += 3
    addText(`Digitally signed by: ${submission.signed_by_user_full_name}`, margin, yPosition, {
      fontSize: 8,
      bold: true,
    })
  }

  return pdf
}

export function downloadCustomerRejectionPDF(submission: FormSubmissionData) {
  const pdf = generateCustomerRejectionPDF(submission)

  // Generate filename with company-specific prefix
  const currentDate = new Date().toISOString().split("T")[0]
  const customerName = submission.submission_data?.customerName
    ? submission.submission_data.customerName.replace(/[^a-zA-Z0-9]/g, "_")
    : "Unknown"
  const serialNumber = submission.submission_data?.serialNumber
    ? submission.submission_data.serialNumber.replace(/[^a-zA-Z0-9]/g, "_")
    : submission.id.slice(0, 8)

  // Use different prefix for Caesarpac Iraq
  const formPrefix = submission.company === "Caesarpac Iraq" ? "BAK-RJ-01" : "CP-RJ-01"
  const filename = `${formPrefix}_${customerName}_${serialNumber}_${currentDate}.pdf`

  // Download the PDF
  pdf.save(filename)

  return filename
}
