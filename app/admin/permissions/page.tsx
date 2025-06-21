"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getUsers, getForms, getUserFormPermissions, updateUserFormPermissions } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Settings } from "lucide-react"

interface User {
  id: string
  full_name: string
  username: string
  email: string
  company: string
  role: string
}

interface Form {
  id: string
  name: string
  slug: string
}

export default function PermissionsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserFullName, setCurrentUserFullName] = useState<string>("")
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [usersData, formsData] = await Promise.all([getUsers(), getForms()])
    setUsers(usersData)
    setForms(formsData)
    setLoading(false)
  }

  const handleEditPermissions = async (user: User) => {
    setCurrentUserId(user.id)
    setCurrentUserFullName(user.full_name)
    const permissions = await getUserFormPermissions(user.id)
    setSelectedFormIds(permissions)
    setIsDialogOpen(true)
  }

  const handleCheckboxChange = (formId: string, checked: boolean) => {
    setSelectedFormIds((prev) => (checked ? [...prev, formId] : prev.filter((id) => id !== formId)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) return

    setIsSubmitting(true)
    const result = await updateUserFormPermissions(currentUserId, selectedFormIds)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: `Permissions updated for ${currentUserFullName}.`,
      })
      setIsDialogOpen(false)
    }
    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Form Permissions</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.company}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEditPermissions(user)}>
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Manage Permissions</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Permissions for {currentUserFullName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            {forms.map((form) => (
              <div key={form.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`form-${form.id}`}
                  checked={selectedFormIds.includes(form.id)}
                  onCheckedChange={(checked) => handleCheckboxChange(form.id, checked === true)}
                />
                <Label htmlFor={`form-${form.id}`}>{form.name}</Label>
              </div>
            ))}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Permissions
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
