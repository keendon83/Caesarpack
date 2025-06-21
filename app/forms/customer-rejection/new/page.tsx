import { CustomerRejectionForm } from "@/components/customer-rejection-form"
import { getCurrentUser } from "@/app/actions" // Keep this import for the dummy user

export default async function NewCustomerRejectionPage() {
  const user = await getCurrentUser() // This will now return the dummy user

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">New Customer Rejection Form</h1>
      <CustomerRejectionForm currentUser={user} />
    </div>
  )
}
