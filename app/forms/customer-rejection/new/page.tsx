import { CustomerRejectionForm } from "@/components/customer-rejection-form"
import { getCurrentUser } from "@/app/actions"
import { redirect } from "next/navigation"

// Make this route dynamic since it uses cookies
export const dynamic = "force-dynamic"

export default async function NewCustomerRejectionPage() {
  let user = null

  try {
    user = await getCurrentUser()
  } catch (error) {
    console.error("Error getting current user in new form page:", error)
    // Don't redirect immediately, let the component handle it
  }

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
