import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { FileText } from "lucide-react"

export default async function FormsPage() {
  // Dummy forms data for now
  const availableForms = [
    {
      id: "dummy-form-id-1",
      name: "Customer Rejection",
      slug: "customer-rejection",
      description: "Form for recording customer rejections and complaints.",
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Available Forms</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableForms.length > 0 ? (
          availableForms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {form.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{form.description}</p>
                <Link href={`/forms/${form.slug}`} passHref>
                  <Button variant="outline" className="w-full">
                    View Submissions
                  </Button>
                </Link>
                <Link href={`/forms/${form.slug}/new`} passHref>
                  <Button className="w-full mt-2">Create New</Button>
                </Link>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground">No forms available.</p>
        )}
      </div>
    </div>
  )
}
