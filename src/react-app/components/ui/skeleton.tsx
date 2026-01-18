import * as React from "react"
import { cn } from "@/react-app/lib/utils"

/**
 * Skeleton & Loading Components - Bitget Style (2026)
 *
 * Colors:
 * - Skeleton bg: #252629
 * - Progress bar track: #2B2F36
 * - Progress bar fill: #FCD535 (teal)
 */

// Basic Skeleton
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text"
}

function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-[#252629] rounded-lg animate-pulse",
        variant === "circular" && "rounded-full",
        variant === "text" && "h-4 rounded",
        className
      )}
      {...props}
    />
  )
}

// Skeleton Card - Bitget style
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5", className)}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

// Skeleton Table Row - Bitget style
function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#2B2F36]">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-8" : "flex-1"
          )}
        />
      ))}
    </div>
  )
}

// Skeleton Stats Card - Bitget style
function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn("bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5", className)}>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

// Skeleton Chart - Bitget style
function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5", className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
      <div className="h-64 flex items-end gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// Spinner Component - Bitget style
interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  }

  return (
    <div
      className={cn(
        "rounded-full border-[#2B2F36] border-t-[#FCD535] animate-spin",
        sizeClasses[size],
        className
      )}
    />
  )
}

// Loading Overlay - Bitget style
interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
  blur?: boolean
}

function LoadingOverlay({
  isLoading,
  children,
  text,
  blur = true,
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center bg-[#151517]/80 rounded-xl z-10",
            blur && "backdrop-blur-sm"
          )}
        >
          <Spinner size="lg" />
          {text && (
            <p className="mt-4 text-sm text-[#9CA3AF]">{text}</p>
          )}
        </div>
      )}
    </div>
  )
}

// Progress Bar - Bitget style (Teal)
interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  variant?: "default" | "success" | "danger" | "warning"
}

function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
  variant = "default",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const variantClasses = {
    default: "bg-[#FCD535]",
    success: "bg-[#FCD535]",
    danger: "bg-[#F43F5E]",
    warning: "bg-[#F59E0B]",
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="h-1.5 bg-[#2B2F36] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[#6B7280] mt-1 text-right">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  )
}

// Pulse Dot (for status indicators) - Bitget style
interface PulseDotProps {
  color?: "default" | "success" | "danger" | "warning"
  className?: string
}

function PulseDot({ color = "default", className }: PulseDotProps) {
  const colorClasses = {
    default: "bg-[#FCD535]",
    success: "bg-[#FCD535]",
    danger: "bg-[#F43F5E]",
    warning: "bg-[#F59E0B]",
  }

  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span
        className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          colorClasses[color]
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          colorClasses[color]
        )}
      />
    </span>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonStats,
  SkeletonChart,
  Spinner,
  LoadingOverlay,
  ProgressBar,
  PulseDot,
}
