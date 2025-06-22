import Image from "next/image"

interface CompanyLogoProps {
  companyName: string
  className?: string
}

const companyLogos: { [key: string]: string } = {
  "Caesarpack Holdings": "/placeholder.svg?height=50&width=150",
  "Caesarpac Kuwait": "/placeholder.svg?height=50&width=150",
  KuwaitBoxes: "/placeholder.svg?height=50&width=150",
  "Caesarpac Iraq": "/images/balad-al-khair-logo.jpg",
}

export function CompanyLogo({ companyName, className }: CompanyLogoProps) {
  const src = companyLogos[companyName] || "/placeholder.svg?height=50&width=150"
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
      />
    </div>
  )
}
