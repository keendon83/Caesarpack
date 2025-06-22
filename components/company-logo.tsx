import Image from "next/image"

interface CompanyLogoProps {
  companyName: string
  className?: string
}

const companyLogos: { [key: string]: string } = {
  "Caesarpack Holdings": "/placeholder.svg?height=50&width=150&text=Caesarpack Holdings",
  "Caesarpac Kuwait": "/placeholder.svg?height=50&width=150&text=Caesarpac Kuwait",
  KuwaitBoxes: "/placeholder.svg?height=50&width=150&text=KuwaitBoxes",
  "Caesarpac Iraq": "/images/balad-al-khair-logo.jpg",
}

export function CompanyLogo({ companyName, className }: CompanyLogoProps) {
  const src = companyLogos[companyName] || "/placeholder.svg?height=50&width=150&text=Logo"
  const alt = `${companyName} logo`

  // Special handling for Balad Al Khair logo which is wider
  const isBaladLogo = companyName === "Caesarpac Iraq"

  return (
    <div className={className}>
      <Image
        src={src || "/placeholder.svg"}
        alt={alt}
        width={isBaladLogo ? 200 : 150}
        height={isBaladLogo ? 60 : 50}
        className="object-contain"
        priority={false}
        unoptimized={src.includes("placeholder.svg")}
        onError={(e) => {
          // Fallback to text if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = "none"
          const parent = target.parentElement
          if (parent && !parent.querySelector(".logo-fallback")) {
            const fallback = document.createElement("div")
            fallback.className = "logo-fallback flex items-center justify-center bg-gray-100 border rounded px-3 py-2"
            fallback.style.width = `${isBaladLogo ? 200 : 150}px`
            fallback.style.height = `${isBaladLogo ? 60 : 50}px`
            fallback.innerHTML = `<span class="text-xs font-semibold text-gray-600">${companyName}</span>`
            parent.appendChild(fallback)
          }
        }}
      />
    </div>
  )
}
