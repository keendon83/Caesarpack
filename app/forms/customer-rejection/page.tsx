import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle, Eye } from "lucide-react"
import { getCustomerRejectionFormSubmissions } from "@/app/actions"

export default async function CustomerRejectionSubmissionsPage() {
  // Fetch actual submissions from database
  const submissions = await getCustomerRejectionFormSubmissions()

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
              <p className="text-sm text-muted-foreground">
                {typeof submissions === "object" && submissions.error
                  ? `Error: ${submissions.error}`
                  : "Create your first submission using the button above."}
              </p>
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
                      <TableCell>{submission.is_signed ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/forms/customer-rejection/${submission.id}`} passHref>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </Link>
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
