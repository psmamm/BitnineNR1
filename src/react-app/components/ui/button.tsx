import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/react-app/lib/utils"

/**
 * Button Component - Bitget Style (2026)
 *
 * Colors:
 * - Primary: WHITE (Bitget main CTA style)
 * - Accent: Cyan #03AAC7 (for colored CTAs)
 * - Secondary: Dark #252629
 * - Ghost: Transparent, hover #252629
 * - Destructive: Red #F43F5E
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03AAC7]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151517] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary - WHITE (Bitget main CTA style)
        default: "bg-white text-[#151517] font-medium hover:bg-[#F4F5F7] active:scale-[0.98]",

        // Destructive - Red
        destructive: "bg-[#F43F5E] text-white font-semibold hover:bg-[#FB7185] hover:shadow-glow-danger active:scale-[0.98]",

        // Outline - Border only
        outline: "border border-[#2B2F36] bg-transparent text-white hover:bg-[#252629] hover:border-[#3A3E45]",

        // Secondary - Dark background (Bitget secondary style)
        secondary: "bg-[#252629] text-white hover:bg-[#2B2F36]",

        // Ghost - No border, subtle hover
        ghost: "text-white hover:bg-[#252629] hover:text-[#03AAC7]",

        // Link style - Cyan text
        link: "text-[#03AAC7] underline-offset-4 hover:underline hover:text-[#26BFD4]",

        // Success/Accent - Cyan (for colored CTAs)
        success: "bg-[#03AAC7] text-[#151517] font-semibold hover:bg-[#26BFD4] hover:shadow-glow active:scale-[0.98]",

        // Premium - Cyan with glow effect
        premium: "bg-[#03AAC7] text-[#151517] font-semibold shadow-glow hover:bg-[#26BFD4] hover:shadow-glow-lg active:scale-[0.98]",

        // Accent - Cyan (alias for success)
        accent: "bg-[#03AAC7] text-[#151517] font-semibold hover:bg-[#26BFD4] hover:shadow-glow active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
