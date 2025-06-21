import { CustomerRejectionForm } from "@/components/customer-rejection-form"
import { getCurrentUser, getCustomerRejectionFormSubmission } from "@/app/actions"
import { redirect } from "next/navigation"

export default async function ViewCustomerRejectionPage({ params }: { params: { id: string } }) {
  // Handle the "new" route case - redirect to the proper new form page
  if (params.id === "new") {
    redirect("/forms/customer-rejection/new")
  }

  const user = await getCurrentUser()
  const submissionResult = await getCustomerRejectionFormSubmission(params.id)

  console.log("ViewCustomerRejectionPage - Submission result:", submissionResult)

  // Handle error case
  if (submissionResult.error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Form</h1>
          <p className="text-muted-foreground mb-4">{submissionResult.error}</p>
          <p className="text-sm text-muted-foreground">Form ID: {params.id}</p>
        </div>
      </div>
    )
  }

  const submission = submissionResult.data

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Customer Rejection Form (CP-RJ-01)</h1>
      <CustomerRejectionForm initialData={submission} submissionId={params.id} currentUser={user} />
    </div>
  )
}
