import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

type LogoVariant = "full" | "icon" | "mono"
type LogoSize = "xs" | "sm" | "md" | "lg" | "xl"

interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  className?: string
  href?: string
  showText?: boolean // For icon variant, optionally show text beside it
}

// Size mappings for each variant
const sizeMap = {
  full: {
    xs: { width: 120, height: 65 },
    sm: { width: 150, height: 82 },
    md: { width: 180, height: 98 },
    lg: { width: 220, height: 120 },
    xl: { width: 280, height: 153 },
  },
  icon: {
    xs: { width: 24, height: 25 },
    sm: { width: 32, height: 34 },
    md: { width: 40, height: 42 },
    lg: { width: 48, height: 51 },
    xl: { width: 64, height: 68 },
  },
  mono: {
    xs: { width: 24, height: 25 },
    sm: { width: 32, height: 34 },
    md: { width: 40, height: 42 },
    lg: { width: 48, height: 51 },
    xl: { width: 64, height: 68 },
  },
}

const variantSrc = {
  full: "/risksure-logo.svg",
  icon: "/risksure-icon.svg",
  mono: "/risksure-icon-mono.svg",
}

export function Logo({
  variant = "full",
  size = "md",
  className,
  href,
  showText = false,
}: LogoProps) {
  const dimensions = sizeMap[variant][size]
  const src = variantSrc[variant]

  const logoImage = (
    <Image
      src={src}
      alt="RiskSure.AI"
      width={dimensions.width}
      height={dimensions.height}
      className={cn("object-contain", className)}
      priority
    />
  )

  // For icon variant with text
  const logoWithText = showText && variant !== "full" ? (
    <div className="flex items-center gap-2">
      {logoImage}
      <span className="font-semibold text-[hsl(220,60%,20%)]">
        RiskSure<span className="text-[hsl(220,10%,45%)]">.AI</span>
      </span>
    </div>
  ) : (
    logoImage
  )

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {logoWithText}
      </Link>
    )
  }

  return logoWithText
}

// Convenience components for common use cases
export function LogoFull({ size = "md", className, href }: Omit<LogoProps, "variant">) {
  return <Logo variant="full" size={size} className={className} href={href} />
}

export function LogoIcon({ size = "md", className, href, showText }: Omit<LogoProps, "variant">) {
  return <Logo variant="icon" size={size} className={className} href={href} showText={showText} />
}

export function LogoMono({ size = "md", className, href }: Omit<LogoProps, "variant">) {
  return <Logo variant="mono" size={size} className={className} href={href} />
}

// Dark background variant (for sidebars, dark sections)
export function LogoDark({
  size = "sm",
  className,
  href,
}: Omit<LogoProps, "variant" | "showText">) {
  const dimensions = sizeMap.icon[size]

  const content = (
    <div className="flex items-center gap-2.5">
      <Image
        src="/risksure-icon.svg"
        alt="RiskSure.AI"
        width={dimensions.width}
        height={dimensions.height}
        className={cn("object-contain", className)}
        priority
      />
      <span className="font-semibold text-sm text-white">
        RiskSure<span className="text-slate-400">.AI</span>
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {content}
      </Link>
    )
  }

  return content
}

// Nav logo specifically styled for the landing page navigation
export function LogoNav({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Image
        src="/risksure-icon.svg"
        alt="RiskSure.AI"
        width={32}
        height={34}
        className="object-contain"
        priority
      />
      <span className="font-bold text-lg text-[hsl(220,60%,20%)]">
        RiskSure<span className="text-[hsl(220,10%,45%)]">.AI</span>
      </span>
    </Link>
  )
}

// Footer logo with muted styling
export function LogoFooter({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Image
        src="/risksure-icon-mono.svg"
        alt="RiskSure.AI"
        width={28}
        height={30}
        className="object-contain opacity-70"
        priority
      />
      <span className="font-bold text-white/70">RiskSure AI</span>
    </Link>
  )
}
