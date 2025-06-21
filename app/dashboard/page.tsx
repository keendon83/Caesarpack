import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/app/actions" // Keep this import for the dummy user

export default async function DashboardPage() {
  const user = await getCurrentUser() // This will now return the dummy user

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>Welcome, {user.full_name}!</CardTitle>
            <CardDescription>
              You are logged in as a {user.role} from {user.company}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p>This is your dashboard. Database connection and authentication are being reconfigured.</p>
        </CardContent>
      </Card>
    </div>
  )
}
