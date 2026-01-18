import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/react-app/lib/utils"

/**
 * Button Component - Binance Style (2026)
 *
 * Colors:
 * - Primary: Yellow #FCD535 (Binance CTA)
 * - Secondary: Dark #2B3139
 * - Success/Buy: Green #0ECB81
 * - Destructive/Sell: Red #F6465D
 * - Ghost: Transparent
 */

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary - Yellow (Binance main CTA)
        default: "bg-brand text-surface-dark font-semibold hover:bg-brand-hover active:scale-[0.98]",

        // Destructive/Sell - Red
        destructive: "bg-loss text-white font-semibold hover:bg-loss-hover hover:shadow-glow-red active:scale-[0.98]",

        // Outline - Border only
        outline: "border border-border-default bg-transparent text-text-primary hover:bg-surface-light hover:border-border-hover",

        // Secondary - Dark background
        secondary: "bg-surface-light text-text-primary hover:bg-surface-hover",

        // Ghost - No border, subtle hover
        ghost: "text-text-primary hover:bg-surface-light hover:text-brand",

        // Link style - Yellow text
        link: "text-brand underline-offset-4 hover:underline hover:text-brand-hover",

        // Success/Buy - Green
        success: "bg-profit text-white font-semibold hover:bg-profit-hover hover:shadow-glow-green active:scale-[0.98]",

        // Premium - Yellow with glow
        premium: "bg-brand text-surface-dark font-semibold shadow-glow-yellow hover:bg-brand-hover active:scale-[0.98]",

        // Accent - Yellow (alias for default)
        accent: "bg-brand text-surface-dark font-semibold hover:bg-brand-hover hover:shadow-glow-yellow active:scale-[0.98]",

        // Buy button - Green
        buy: "bg-profit text-white font-semibold hover:bg-profit-hover active:scale-[0.98]",

        // Sell button - Red
        sell: "bg-loss text-white font-semibold hover:bg-loss-hover active:scale-[0.98]",
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
