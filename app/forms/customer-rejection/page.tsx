"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle, Eye, Download, Loader2 } from "lucide-react"
import { getCustomerRejectionFormSubmissions } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { downloadCustomerRejectionPDF } from "@/lib/pdf-generator"

export default function CustomerRejectionSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    setLoading(true)
    const result = await getCustomerRejectionFormSubmissions()
    if (Array.isArray(result)) {
      setSubmissions(result)
    } else if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
      setSubmissions([])
    }
    setLoading(false)
  }

  const handleDownloadPDF = async (submission: any) => {
    if (!submission.is_signed) {
      toast({
        title: "Cannot Download PDF",
        description: "Only signed forms can be downloaded as PDF.",
        variant: "destructive",
      })
      return
    }

    setDownloadingId(submission.id)
    toast({
      title: "Generating PDF",
      description: "Please wait while the PDF is being generated...",
      duration: 3000,
    })

    try {
      const filename = downloadCustomerRejectionPDF(submission)

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
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading submissions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customer Rejection Submissions (CP-RJ-01)</h1>
        <Link href="/forms/customer-rejection/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> New Submission
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(submissions) || submissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No submissions found for this form.</p>
              <p className="text-sm text-muted-foreground">Create your first submission using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial No.</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Signed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission: any) => (
                    <TableRow key={submission.id}>
                      <TableCell>{submission.submission_data?.serialNumber || "N/A"}</TableCell>
                      <TableCell>{submission.submission_data?.customerName || "N/A"}</TableCell>
                      <TableCell>{submission.company}</TableCell>
                      <TableCell>{submission.users?.full_name || "Unknown"}</TableCell>
                      <TableCell>{submission.submission_data?.issueDate || "N/A"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.is_signed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {submission.is_signed ? "Yes" : "No"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/forms/customer-rejection/${submission.id}`} passHref>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </Link>
                          {submission.is_signed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPDF(submission)}
                              disabled={downloadingId === submission.id}
                            >
                              {downloadingId === submission.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              <span className="sr-only">Download PDF</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
