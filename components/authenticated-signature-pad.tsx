"use client"

import { useState } from "react"
import { SignaturePad } from "@/components/signature-pad"
import { SignatureAuthDialog } from "@/components/signature-auth-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthenticatedSignaturePadProps {
  width?: number
  height?: number
  onSave: (dataUrl: string) => void
  onAuthSuccess?: (authenticatedUser: any) => void // Add this prop
  initialSignature?: string | null
  readOnly?: boolean
  className?: string
  isLocked?: boolean
  signedByUser?: { full_name: string } | null
  signedAt?: string | null
}

export function AuthenticatedSignaturePad({
  width = 400,
  height = 200,
  onSave,
  onAuthSuccess,
  initialSignature,
  readOnly = false,
  className,
  isLocked = false,
  signedByUser,
  signedAt,
}: AuthenticatedSignaturePadProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null)
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const handleAuthSuccess = (user: any) => {
    setIsAuthenticated(true)
    setAuthenticatedUser(user)
    // Call the parent callback if provided
    if (onAuthSuccess) {
      onAuthSuccess(user)
    }
  }

  const handleSignaturePadClick = () => {
    if (isLocked || readOnly) return

    if (!isAuthenticated) {
      setShowAuthDialog(true)
    }
  }

  const handleSignatureSave = (dataUrl: string) => {
    if (isAuthenticated && authenticatedUser) {
      onSave(dataUrl)
    }
  }

  const canSign = isAuthenticated && !isLocked && !readOnly

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Authentication Status */}
      {isAuthenticated && authenticatedUser && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <Unlock className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            Authorized to sign as: <strong>{authenticatedUser.full_name}</strong>
            {authenticatedUser.role === "ceo" && (
              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                CEO - Can sign from any account
              </span>
            )}
          </span>
          <Badge variant="outline" className="text-green-700 border-green-300">
            {authenticatedUser.role.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Signature Status for Locked Forms */}
      {isLocked && signedByUser && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <Lock className="h-4 w-4 text-blue-600" />
          <User className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Signed by: <strong>{signedByUser.full_name}</strong>
            {signedAt && <span className="ml-2 text-xs text-blue-600">on {new Date(signedAt).toLocaleString()}</span>}
          </span>
        </div>
      )}

      {/* Signature Pad Container */}
      <div
        className={cn(
          "relative",
          !canSign && !isLocked && "cursor-pointer hover:bg-gray-50 rounded-md transition-colors",
          isLocked && "opacity-75",
        )}
        onClick={handleSignaturePadClick}
      >
        <SignaturePad
          width={width}
          height={height}
          onSave={handleSignatureSave}
          initialSignature={initialSignature}
          readOnly={!canSign}
          className={className}
        />

        {/* Overlay for unauthenticated state */}
        {!isAuthenticated && !isLocked && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-md">
            <div className="text-center">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">Click to Authenticate</p>
              <p className="text-xs text-gray-500">Authentication required to sign</p>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Instructions */}
      {!isAuthenticated && !isLocked && !readOnly && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setShowAuthDialog(true)} className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Authenticate to Sign
          </Button>
          <p className="text-xs text-muted-foreground mt-1">Only authorized personnel can sign this form</p>
        </div>
      )}

      {/* Authentication Dialog */}
      <SignatureAuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} onAuthSuccess={handleAuthSuccess} />
    </div>
  )
}
