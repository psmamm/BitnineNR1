import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/react-app/lib/utils"

/**
 * Input Component - Bitget Style (2026)
 *
 * Colors:
 * - Background: #252629 (surface)
 * - Border: #2B2F36
 * - Focus border: #03AAC7 (cyan)
 * - Text: #FFFFFF
 * - Placeholder: #6B7280
 */

const inputVariants = cva(
  "flex w-full rounded-lg text-sm transition-all duration-100 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Default input - Bitget style
        default: "bg-[#252629] border border-[#2B2F36] text-white focus:border-[#03AAC7] focus:outline-none",

        // Ghost - No border until focus
        ghost: "bg-transparent border-transparent text-white focus:bg-[#252629] focus:border-[#2B2F36] focus:outline-none",

        // Filled - Solid background
        filled: "bg-[#252629] border border-transparent text-white focus:border-[#03AAC7] focus:outline-none",

        // Outline - Border only
        outline: "bg-transparent border border-[#2B2F36] text-white focus:border-[#03AAC7] focus:outline-none",

        // Error state
        error: "bg-[#252629] border border-[#F43F5E]/50 text-white focus:border-[#F43F5E] focus:outline-none",

        // Success state
        success: "bg-[#252629] border border-[#03AAC7]/50 text-white focus:border-[#03AAC7] focus:outline-none",
      },
      inputSize: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, type, icon, rightIcon, ...props }, ref) => {
    if (icon || rightIcon) {
      return (
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, inputSize, className }),
              icon && "pl-10",
              rightIcon && "pr-10"
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
              {rightIcon}
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Textarea component - Bitget style
const textareaVariants = cva(
  "flex w-full rounded-lg text-sm transition-all duration-100 placeholder:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "bg-[#252629] border border-[#2B2F36] text-white focus:border-[#03AAC7] focus:outline-none",
        ghost: "bg-transparent border-transparent text-white focus:bg-[#252629] focus:border-[#2B2F36] focus:outline-none",
        filled: "bg-[#252629] border border-transparent text-white focus:border-[#03AAC7] focus:outline-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          textareaVariants({ variant, className }),
          "min-h-[80px] p-4"
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

// Label component - Bitget style
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Input, Textarea, Label, inputVariants, textareaVariants }
