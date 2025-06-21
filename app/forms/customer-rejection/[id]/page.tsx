import { CustomerRejectionForm } from "@/components/customer-rejection-form"
import { getCurrentUser } from "@/app/actions" // Keep this import for the dummy user

export default async function ViewCustomerRejectionPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser() // This will now return the dummy user

  // Dummy submission data for now
  const submission = {
    id: params.id,
    submission_data: {
      serialNumber: "DUMMY-SN-123",
      customerName: "Dummy Customer",
      issueDate: "2024-01-01",
      signature: null,
    },
    is_signed: false,
    company: "Caesarpack Holdings",
    users: { full_name: "Dummy Submitter" },
    signed_by_user: null,
    signed_at: null,
    pdf_url: null,
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Customer Rejection Form (CP-RJ-01)</h1>
      <CustomerRejectionForm initialData={submission} submissionId={params.id} currentUser={user} />
    </div>
  )
}
