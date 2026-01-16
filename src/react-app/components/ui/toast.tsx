import * as React from "react"
import { cn } from "@/react-app/lib/utils"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"

/**
 * Toast Notification System - Bitget Style (2026)
 *
 * Features:
 * - Dark background (#1B1B1D)
 * - Border (#2B2F36)
 * - Multiple variants (success, error, warning, info)
 * - Auto-dismiss with progress
 * - Stack multiple toasts
 * - Smooth animations
 */

// Toast Types
type ToastVariant = "default" | "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Toast Context
interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => string
  removeToast: (id: string) => void
  clearAll: () => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// Toast Provider
interface ToastProviderProps {
  children: React.ReactNode
  maxToasts?: number
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center"
}

export const ToastProvider = ({
  children,
  maxToasts = 5,
  position = "bottom-right",
}: ToastProviderProps) => {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => {
      const newToasts = [...prev, { ...toast, id }]
      return newToasts.slice(-maxToasts)
    })
    return id
  }, [maxToasts])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearAll = React.useCallback(() => {
    setToasts([])
  }, [])

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <div
        className={cn(
          "fixed z-[100] flex flex-col gap-2",
          positionClasses[position]
        )}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Toast Item Component
interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  const duration = toast.duration ?? 5000
  const [progress, setProgress] = React.useState(100)
  const [isPaused, setIsPaused] = React.useState(false)

  React.useEffect(() => {
    if (duration <= 0) return

    const startTime = Date.now()
    let animationFrame: number

    const updateProgress = () => {
      if (isPaused) {
        animationFrame = requestAnimationFrame(updateProgress)
        return
      }

      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining > 0) {
        animationFrame = requestAnimationFrame(updateProgress)
      } else {
        onClose()
      }
    }

    animationFrame = requestAnimationFrame(updateProgress)

    return () => cancelAnimationFrame(animationFrame)
  }, [duration, onClose, isPaused])

  const variantConfig = {
    default: {
      icon: null,
      iconClass: "",
      progressClass: "bg-[#03AAC7]",
    },
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      iconClass: "text-[#03AAC7]",
      progressClass: "bg-[#03AAC7]",
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      iconClass: "text-[#F43F5E]",
      progressClass: "bg-[#F43F5E]",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      iconClass: "text-[#F59E0B]",
      progressClass: "bg-[#F59E0B]",
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      iconClass: "text-[#3B82F6]",
      progressClass: "bg-[#3B82F6]",
    },
  }

  const config = variantConfig[toast.variant || "default"]

  return (
    <div
      className={cn(
        "relative w-80 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl shadow-dropdown",
        "animate-in slide-in-from-right-full fade-in duration-300",
        "overflow-hidden"
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {config.icon && (
          <span className={cn("flex-shrink-0 mt-0.5", config.iconClass)}>
            {config.icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-medium text-white">{toast.title}</p>
          )}
          {toast.description && (
            <p className={cn(
              "text-sm text-[#9CA3AF]",
              toast.title && "mt-1"
            )}>
              {toast.description}
            </p>
          )}
          {toast.action && (
            <button
              className="mt-2 text-sm font-medium text-[#03AAC7] hover:text-[#26BFD4] transition-colors"
              onClick={toast.action.onClick}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          className="flex-shrink-0 p-1 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#252629] transition-colors"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2B2F36]">
          <div
            className={cn("h-full transition-all duration-100", config.progressClass)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Convenience hook for showing toasts
export const toast = {
  success: (title: string, description?: string) => {
    // This will be filled by the context
    console.log("Toast success:", title, description)
  },
  error: (title: string, description?: string) => {
    console.log("Toast error:", title, description)
  },
  warning: (title: string, description?: string) => {
    console.log("Toast warning:", title, description)
  },
  info: (title: string, description?: string) => {
    console.log("Toast info:", title, description)
  },
}

// Toaster component (wrapper for ToastProvider with default settings)
export const Toaster = ({ position: _position = "bottom-right" }: { position?: ToastProviderProps["position"] }) => {
  return null // The actual rendering is done by ToastProvider
}

// Hook to use toast functions
export function useToastActions() {
  const { addToast } = useToast()

  return {
    success: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ title, description, variant: "success", ...options }),
    error: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ title, description, variant: "error", ...options }),
    warning: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ title, description, variant: "warning", ...options }),
    info: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ title, description, variant: "info", ...options }),
    custom: (toast: Omit<Toast, "id">) => addToast(toast),
  }
}

export { ToastItem }
export type { Toast, ToastVariant }
