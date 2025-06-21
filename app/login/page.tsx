import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { signIn } from "@/app/actions"

export default async function LoginPage() {
  // No user check here for now, as getCurrentUser returns a dummy.
  // The redirect will happen from RootLayout if not "logged in" (i.e., no dummy user).
  // Once NextAuth.js is integrated, this page will handle actual login.

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Caesar Pack Login</CardTitle>
          <CardDescription>Enter your username and password to access the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="john.doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p>For internal use only.</p>
        </CardFooter>
      </Card>
    </div>
  )
}
