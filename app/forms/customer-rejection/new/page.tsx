import { CustomerRejectionForm } from "@/components/customer-rejection-form"
import { getCurrentUser } from "@/app/actions"
import { redirect } from "next/navigation"

export default async function NewCustomerRejectionPage() {
  const user = await getCurrentUser()

  // If no user is authenticated, redirect to login
  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">New Customer Rejection Form</h1>
      <CustomerRejectionForm currentUser={user} />
    </div>
  )
}
