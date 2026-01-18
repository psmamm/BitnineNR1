import * as React from "react"
import { cn } from "@/react-app/lib/utils"
import { ChevronRight, Check } from "lucide-react"

/**
 * Dropdown Menu Component - Bitget Style (2026)
 *
 * Features:
 * - Dark background (#1B1B1D)
 * - Border (#2B2F36)
 * - Icon + Label layout
 * - Hover state with background change
 * - Sections with headers
 * - Smooth animations
 */

// Context for dropdown state
interface DropdownContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownContext = React.createContext<DropdownContextValue | undefined>(undefined)

const useDropdown = () => {
  const context = React.useContext(DropdownContext)
  if (!context) {
    throw new Error("Dropdown components must be used within a DropdownMenu")
  }
  return context
}

// Root component
interface DropdownMenuProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DropdownMenu = ({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

// Trigger button
interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useDropdown()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setOpen(!open)
      props.onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn("focus:outline-none", className)}
        onClick={handleClick}
        aria-expanded={open}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

// Content container
interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, children, align = "start", side = "bottom", sideOffset = 4, ...props }, ref) => {
    const { open, setOpen } = useDropdown()
    const contentRef = React.useRef<HTMLDivElement>(null)

    // Close on click outside
    React.useEffect(() => {
      if (!open) return

      const handleClickOutside = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false)
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)

      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        document.removeEventListener("keydown", handleEscape)
      }
    }, [open, setOpen])

    if (!open) return null

    const alignClasses = {
      start: "left-0",
      center: "left-1/2 -translate-x-1/2",
      end: "right-0",
    }

    const sideClasses = {
      top: "bottom-full mb-1",
      bottom: "top-full mt-1",
      left: "right-full mr-1",
      right: "left-full ml-1",
    }

    return (
      <div
        ref={(node) => {
          contentRef.current = node
          if (typeof ref === "function") ref(node)
          else if (ref) ref.current = node
        }}
        className={cn(
          "absolute z-50 min-w-[200px] overflow-hidden",
          "bg-[#1B1B1D] border border-[#2B2F36] rounded-xl",
          "shadow-dropdown p-2",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          alignClasses[align],
          sideClasses[side],
          className
        )}
        style={{ marginTop: side === "bottom" ? sideOffset : undefined }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

// Menu Item
interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
  icon?: React.ReactNode
  shortcut?: string
  destructive?: boolean
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, children, disabled, icon, shortcut, destructive, onClick, ...props }, ref) => {
    const { setOpen } = useDropdown()

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return
      onClick?.(e)
      setOpen(false)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
          "text-sm text-[#9CA3AF] transition-colors duration-150",
          "hover:bg-[#252629] hover:text-white",
          disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-[#9CA3AF]",
          destructive && "text-[#F43F5E] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10",
          className
        )}
        onClick={handleClick}
        role="menuitem"
        aria-disabled={disabled}
        {...props}
      >
        {icon && <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-70">{icon}</span>}
        <span className="flex-1">{children}</span>
        {shortcut && (
          <span className="text-xs text-[#6B7280] ml-auto">{shortcut}</span>
        )}
      </div>
    )
  }
)
DropdownMenuItem.displayName = "DropdownMenuItem"

// Checkbox Item
interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, children, checked, onCheckedChange, icon, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onCheckedChange?.(!checked)
      props.onClick?.(e)
    }

    return (
      <DropdownMenuItem
        ref={ref}
        className={className}
        onClick={handleClick}
        icon={icon}
        {...props}
      >
        <span className="flex-1">{children}</span>
        <span className={cn(
          "w-4 h-4 rounded border flex items-center justify-center",
          checked ? "bg-[#03AAC7] border-[#03AAC7]" : "border-[#2B2F36]"
        )}>
          {checked && <Check className="w-3 h-3 text-[#151517]" />}
        </span>
      </DropdownMenuItem>
    )
  }
)
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

// Separator
const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-px my-2 bg-[#2B2F36]", className)}
    role="separator"
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

// Label/Header
const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-3 py-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

// Group
const DropdownMenuGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("", className)}
    role="group"
    {...props}
  />
))
DropdownMenuGroup.displayName = "DropdownMenuGroup"

// Sub Menu (nested)
interface DropdownMenuSubProps {
  children: React.ReactNode
}

const DropdownMenuSub = ({ children }: DropdownMenuSubProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

// Sub Menu Trigger
interface DropdownMenuSubTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
}

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ className, children, icon, ...props }, ref) => {
    const { open } = useDropdown()

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
          "text-sm text-[#9CA3AF] transition-colors duration-150",
          "hover:bg-[#252629] hover:text-white",
          open && "bg-[#252629] text-white",
          className
        )}
        {...props}
      >
        {icon && <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-70">{icon}</span>}
        <span className="flex-1">{children}</span>
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
    )
  }
)
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

// Sub Menu Content
const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = useDropdown()

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-full top-0 ml-1 min-w-[200px]",
        "bg-[#1B1B1D] border border-[#2B2F36] rounded-xl",
        "shadow-dropdown p-2",
        "animate-in fade-in-0 slide-in-from-left-2 duration-200",
        className
      )}
      {...props}
    />
  )
})
DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
