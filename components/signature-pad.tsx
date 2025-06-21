"use client"

import type React from "react"
import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SignaturePadProps {
  width?: number
  height?: number
  onSave: (dataUrl: string) => void
  initialSignature?: string | null
  readOnly?: boolean
  className?: string
}

export function SignaturePad({
  width = 400,
  height = 200,
  onSave,
  initialSignature,
  readOnly = false,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [currentSignature, setCurrentSignature] = useState<string | null>(initialSignature || null)

  const getCanvas = useCallback(() => canvasRef.current, [])
  const getContext = useCallback(() => getCanvas()?.getContext("2d"), [getCanvas])

  const clearCanvas = useCallback(() => {
    const ctx = getContext()
    if (ctx) {
      ctx.clearRect(0, 0, width, height)
      setIsEmpty(true)
      setCurrentSignature(null)
    }
  }, [getContext, width, height])

  const loadImage = useCallback(() => {
    const ctx = getContext()
    if (ctx && initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        setIsEmpty(false)
        setCurrentSignature(initialSignature)
      }
      img.src = initialSignature
    } else {
      clearCanvas()
    }
  }, [getContext, initialSignature, width, height, clearCanvas])

  useEffect(() => {
    const canvas = getCanvas()
    if (!canvas) return

    const ctx = getContext()
    if (!ctx) return

    // Set canvas dimensions for high-DPI screens
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#000"

    loadImage()
  }, [width, height, getCanvas, getContext, loadImage])

  useEffect(() => {
    // Re-load image if initialSignature changes
    loadImage()
  }, [initialSignature, loadImage])

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (readOnly) return
      setIsDrawing(true)
      setIsEmpty(false)
      const ctx = getContext()
      if (ctx) {
        const rect = canvasRef.current?.getBoundingClientRect()
        const x = "touches" in e ? e.touches[0].clientX - (rect?.left || 0) : e.nativeEvent.offsetX
        const y = "touches" in e ? e.touches[0].clientY - (rect?.top || 0) : e.nativeEvent.offsetY
        ctx.beginPath()
        ctx.moveTo(x, y)
      }
    },
    [getContext, readOnly],
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || readOnly) return
      const ctx = getContext()
      if (ctx) {
        const rect = canvasRef.current?.getBoundingClientRect()
        const x = "touches" in e ? e.touches[0].clientX - (rect?.left || 0) : e.nativeEvent.offsetX
        const y = "touches" in e ? e.touches[0].clientY - (rect?.top || 0) : e.nativeEvent.offsetY
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    },
    [isDrawing, getContext, readOnly],
  )

  const endDrawing = useCallback(() => {
    if (readOnly) return
    setIsDrawing(false)
    const canvas = getCanvas()
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png")
      setCurrentSignature(dataUrl)
      onSave(dataUrl)
    }
  }, [getCanvas, onSave, readOnly])

  const handleClear = () => {
    clearCanvas()
    onSave("") // Notify parent that signature is cleared
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "relative border border-gray-300 rounded-md overflow-hidden",
          readOnly && "bg-gray-50 cursor-not-allowed",
        )}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseOut={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="block"
          style={{ touchAction: "none" }} // Prevent scrolling on touch devices
        />
        {isEmpty && !currentSignature && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
            {readOnly ? "No signature" : "Draw your signature here"}
          </div>
        )}
      </div>
      {!readOnly && (
        <Button variant="outline" onClick={handleClear} disabled={isEmpty && !currentSignature}>
          Clear Signature
        </Button>
      )}
    </div>
  )
}
