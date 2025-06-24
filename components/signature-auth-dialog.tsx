"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock } from "lucide-react"
import { authenticateForSignature } from "@/app/actions"

interface SignatureAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthSuccess: (authenticatedUser: any) => void
}

export function SignatureAuthDialog({ open, onOpenChange, onAuthSuccess }: SignatureAuthDialogProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Add this line to prevent event bubbling
    setIsAuthenticating(true)
    setError("")

    try {
      const result = await authenticateForSignature(username, password)

      if (result.error) {
        setError(result.error)
      } else if (result.user) {
        // Check if user has signing privileges (admin or ceo role)
        if (result.user.role !== "admin" && result.user.role !== "ceo") {
          setError("Only administrators and CEOs can sign forms.")
        } else {
          onAuthSuccess(result.user)
          onOpenChange(false)
          // Reset form
          setUsername("")
          setPassword("")
          setError("")
        }
      }
    } catch (error: any) {
      setError("Authentication failed. Please try again.")
    }

    setIsAuthenticating(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    setUsername("")
    setPassword("")
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Authentication Required
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Please authenticate to enable the signature pad. Only authorized personnel (administrators and CEOs) can
              sign forms.
            </p>
            <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
              <strong>Note:</strong> CEOs can sign forms from any user account by providing their own credentials here.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth-username">Username</Label>
            <Input
              id="auth-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={isAuthenticating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isAuthenticating}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isAuthenticating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isAuthenticating}
              onClick={(e) => {
                e.stopPropagation() // Prevent event bubbling
              }}
            >
              {isAuthenticating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Authenticate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
