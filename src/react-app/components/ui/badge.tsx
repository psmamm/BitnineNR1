import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/react-app/lib/utils"
import { Check, Shield, Star, Crown, Zap } from "lucide-react"

/**
 * Badge Component - Bitget Style (2026)
 *
 * Variants:
 * - default: Gray background
 * - verified: Teal (like Bitget verified badge)
 * - vip: Dark with gold/yellow accent
 * - success: Teal
 * - warning: Orange
 * - danger: Red
 * - outline: Border only
 */

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Default - Gray
        default: "bg-[#2B2F36] text-[#9CA3AF]",

        // Verified - Cyan (Bitget style)
        verified: "bg-[#03AAC7]/10 text-[#03AAC7]",

        // VIP levels
        vip: "bg-[#2B2F36] text-[#9CA3AF]",
        "vip-gold": "bg-[#F59E0B]/10 text-[#F59E0B]",
        "vip-platinum": "bg-[#9CA3AF]/10 text-[#9CA3AF]",

        // Status colors
        success: "bg-[#03AAC7]/10 text-[#03AAC7]",
        warning: "bg-[#F59E0B]/10 text-[#F59E0B]",
        danger: "bg-[#F43F5E]/10 text-[#F43F5E]",

        // Outline - Border only
        outline: "border border-[#2B2F36] text-[#9CA3AF]",

        // Pro/Premium
        pro: "bg-gradient-to-r from-[#03AAC7] to-[#028BA3] text-[#151517] font-semibold",
        elite: "bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#151517] font-semibold",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {icon}
        {children}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// Pre-built badge components for common use cases

interface VerifiedBadgeProps {
  size?: "sm" | "default" | "lg"
  className?: string
}

const VerifiedBadge = ({ size = "default", className }: VerifiedBadgeProps) => (
  <Badge variant="verified" size={size} className={className}>
    <Check className="h-3 w-3" />
    Verified
  </Badge>
)

interface VIPBadgeProps {
  level?: number
  size?: "sm" | "default" | "lg"
  className?: string
}

const VIPBadge = ({ level = 1, size = "default", className }: VIPBadgeProps) => {
  const variant = level >= 5 ? "vip-gold" : level >= 3 ? "vip-platinum" : "vip"
  return (
    <Badge variant={variant} size={size} className={className}>
      <Star className="h-3 w-3" />
      VIP {level}
    </Badge>
  )
}

interface ProBadgeProps {
  size?: "sm" | "default" | "lg"
  className?: string
}

const ProBadge = ({ size = "default", className }: ProBadgeProps) => (
  <Badge variant="pro" size={size} className={className}>
    <Zap className="h-3 w-3" />
    PRO
  </Badge>
)

const EliteBadge = ({ size = "default", className }: ProBadgeProps) => (
  <Badge variant="elite" size={size} className={className}>
    <Crown className="h-3 w-3" />
    ELITE
  </Badge>
)

interface StatusBadgeProps {
  status: "online" | "offline" | "away" | "busy"
  size?: "sm" | "default" | "lg"
  showText?: boolean
  className?: string
}

const StatusBadge = ({ status, size = "default", showText = true, className }: StatusBadgeProps) => {
  const statusConfig = {
    online: { variant: "success" as const, text: "Online", dot: "bg-[#03AAC7]" },
    offline: { variant: "default" as const, text: "Offline", dot: "bg-[#6B7280]" },
    away: { variant: "warning" as const, text: "Away", dot: "bg-[#F59E0B]" },
    busy: { variant: "danger" as const, text: "Busy", dot: "bg-[#F43F5E]" },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} size={size} className={className}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {showText && config.text}
    </Badge>
  )
}

interface SecurityBadgeProps {
  level: "low" | "medium" | "high"
  size?: "sm" | "default" | "lg"
  className?: string
}

const SecurityBadge = ({ level, size = "default", className }: SecurityBadgeProps) => {
  const levelConfig = {
    low: { variant: "danger" as const, text: "Low Security" },
    medium: { variant: "warning" as const, text: "Medium Security" },
    high: { variant: "success" as const, text: "High Security" },
  }

  const config = levelConfig[level]

  return (
    <Badge variant={config.variant} size={size} className={className}>
      <Shield className="h-3 w-3" />
      {config.text}
    </Badge>
  )
}

export {
  Badge,
  VerifiedBadge,
  VIPBadge,
  ProBadge,
  EliteBadge,
  StatusBadge,
  SecurityBadge,
  badgeVariants,
}

