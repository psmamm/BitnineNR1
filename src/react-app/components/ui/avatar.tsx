import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/react-app/lib/utils"
import { User } from "lucide-react"

/**
 * Avatar Component - Bitget Style (2026)
 *
 * Features:
 * - Rounded square (12px radius) like Bitget
 * - Border with dark color
 * - Fallback to initials or icon
 * - Status indicator support
 * - Multiple sizes
 */

const avatarVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden bg-[#252629] border-2 border-[#2B2F36] flex-shrink-0",
  {
    variants: {
      size: {
        xs: "h-6 w-6 rounded-md text-[10px]",
        sm: "h-8 w-8 rounded-lg text-xs",
        default: "h-10 w-10 rounded-lg text-sm",
        lg: "h-12 w-12 rounded-xl text-base",
        xl: "h-16 w-16 rounded-xl text-lg",
        "2xl": "h-20 w-20 rounded-2xl text-xl",
      },
      shape: {
        square: "", // Uses the rounded from size
        circle: "!rounded-full",
      },
    },
    defaultVariants: {
      size: "default",
      shape: "square",
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null
  alt?: string
  fallback?: string
  status?: "online" | "offline" | "away" | "busy"
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, shape, src, alt, fallback, status, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)

    // Get initials from fallback or alt
    const getInitials = (name?: string) => {
      if (!name) return null
      const parts = name.split(" ")
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }

    const initials = getInitials(fallback || alt)
    const showImage = src && !imageError
    const showFallback = !showImage

    // Status indicator size based on avatar size
    const statusSizeMap = {
      xs: "h-1.5 w-1.5 border",
      sm: "h-2 w-2 border",
      default: "h-2.5 w-2.5 border-2",
      lg: "h-3 w-3 border-2",
      xl: "h-3.5 w-3.5 border-2",
      "2xl": "h-4 w-4 border-2",
    }

    const statusColorMap = {
      online: "bg-[#FCD535]",
      offline: "bg-[#6B7280]",
      away: "bg-[#F59E0B]",
      busy: "bg-[#F43F5E]",
    }

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, shape, className }))}
        {...props}
      >
        {showImage && (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
        {showFallback && (
          <span className="font-medium text-[#9CA3AF] select-none">
            {initials || <User className="h-1/2 w-1/2" />}
          </span>
        )}
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-[#151517]",
              statusSizeMap[size || "default"],
              statusColorMap[status]
            )}
          />
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

// Avatar Group for stacking multiple avatars
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  max?: number
  size?: "xs" | "sm" | "default" | "lg" | "xl" | "2xl"
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 4, size = "default", ...props }, ref) => {
    const childArray = React.Children.toArray(children)
    const visibleChildren = max ? childArray.slice(0, max) : childArray
    const remainingCount = childArray.length - visibleChildren.length

    return (
      <div ref={ref} className={cn("flex -space-x-2", className)} {...props}>
        {visibleChildren.map((child, index) => (
          <div key={index} className="relative ring-2 ring-[#151517] rounded-lg">
            {child}
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              avatarVariants({ size }),
              "ring-2 ring-[#151517] bg-[#2B2F36] text-[#9CA3AF] font-medium"
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = "AvatarGroup"

// User Profile Card (Avatar + Name + UID like Bitget)
interface UserProfileProps {
  src?: string | null
  name: string
  uid?: string
  verified?: boolean
  vipLevel?: number
  size?: "sm" | "default" | "lg"
  className?: string
}

const UserProfile = ({
  src,
  name,
  uid,
  verified,
  vipLevel,
  size = "default",
  className,
}: UserProfileProps) => {
  const sizeConfig = {
    sm: { avatar: "sm" as const, nameClass: "text-sm", uidClass: "text-xs" },
    default: { avatar: "default" as const, nameClass: "text-base", uidClass: "text-xs" },
    lg: { avatar: "lg" as const, nameClass: "text-lg", uidClass: "text-sm" },
  }

  const config = sizeConfig[size]

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar src={src} fallback={name} size={config.avatar} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-white", config.nameClass)}>
            {name}
          </span>
          {verified && (
            <span className="text-[#FCD535]">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
          {vipLevel && vipLevel > 0 && (
            <span className="px-1.5 py-0.5 bg-[#2B2F36] text-[#9CA3AF] text-[10px] font-medium rounded">
              VIP{vipLevel}
            </span>
          )}
        </div>
        {uid && (
          <span className={cn("text-[#6B7280]", config.uidClass)}>
            UID: {uid}
          </span>
        )}
      </div>
    </div>
  )
}

export { Avatar, AvatarGroup, UserProfile, avatarVariants }
