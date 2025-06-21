import Image from "next/image"

interface CompanyLogoProps {
  companyName: string
  className?: string
}

const companyLogos: { [key: string]: string } = {
  "Caesarpack Holdings": "/placeholder.svg?height=50&width=150",
  "Caesarpac Kuwait": "/placeholder.svg?height=50&width=150",
  KuwaitBoxes: "/placeholder.svg?height=50&width=150",
  "Caesarpac Iraq": "/placeholder.svg?height=50&width=150",
}

export function CompanyLogo({ companyName, className }: CompanyLogoProps) {
  const src = companyLogos[companyName] || "/placeholder.svg?height=50&width=150"
  const alt = `${companyName} logo`

  return (
    <div className={className}>
      <Image src={src || "/placeholder.svg"} alt={alt} width={150} height={50} className="object-contain" />
    </div>
  )
}
