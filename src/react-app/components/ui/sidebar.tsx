import * as React from "react"
import { cn } from "@/react-app/lib/utils"
import { ChevronRight, ChevronDown } from "lucide-react"

/**
 * Sidebar Component - Bitget Style (2026)
 *
 * Features:
 * - Dark background (#151517)
 * - Border right (#2B2F36)
 * - Icon + Label items
 * - Active state with teal color
 * - Collapsible sections
 * - Mobile responsive
 */

// Sidebar Context
interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined)

const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("Sidebar components must be used within a Sidebar")
  }
  return context
}

// Root Sidebar
interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultCollapsed?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  width?: number
  collapsedWidth?: number
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({
    className,
    children,
    defaultCollapsed = false,
    collapsed: controlledCollapsed,
    onCollapsedChange,
    width = 240,
    collapsedWidth = 64,
    ...props
  }, ref) => {
    const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(defaultCollapsed)
    const isControlled = controlledCollapsed !== undefined
    const collapsed = isControlled ? controlledCollapsed : uncontrolledCollapsed

    const setCollapsed = React.useCallback(
      (newCollapsed: boolean) => {
        if (!isControlled) {
          setUncontrolledCollapsed(newCollapsed)
        }
        onCollapsedChange?.(newCollapsed)
      },
      [isControlled, onCollapsedChange]
    )

    return (
      <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
        <aside
          ref={ref}
          className={cn(
            "flex flex-col h-full bg-[#151517] border-r border-[#2B2F36]",
            "transition-all duration-300 ease-in-out",
            className
          )}
          style={{ width: collapsed ? collapsedWidth : width }}
          {...props}
        >
          {children}
        </aside>
      </SidebarContext.Provider>
    )
  }
)
Sidebar.displayName = "Sidebar"

// Sidebar Header
const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center h-16 px-4 border-b border-[#2B2F36]", className)}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

// Sidebar Content
const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto py-2 px-2", className)}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

// Sidebar Footer
const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-auto p-4 border-t border-[#2B2F36]", className)}
    {...props}
  />
))
SidebarFooter.displayName = "SidebarFooter"

// Sidebar Group
interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  defaultOpen?: boolean
  collapsible?: boolean
}

const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, children, label, defaultOpen = true, collapsible = false, ...props }, ref) => {
    const [open, setOpen] = React.useState(defaultOpen)
    const { collapsed } = useSidebar()

    return (
      <div ref={ref} className={cn("mb-2", className)} {...props}>
        {label && !collapsed && (
          <div
            className={cn(
              "flex items-center justify-between px-3 py-2",
              collapsible && "cursor-pointer hover:bg-[#1B1B1D] rounded-lg"
            )}
            onClick={() => collapsible && setOpen(!open)}
          >
            <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">
              {label}
            </span>
            {collapsible && (
              open ? <ChevronDown className="w-4 h-4 text-[#6B7280]" /> : <ChevronRight className="w-4 h-4 text-[#6B7280]" />
            )}
          </div>
        )}
        {(!collapsible || open) && (
          <div className="space-y-0.5">{children}</div>
        )}
      </div>
    )
  }
)
SidebarGroup.displayName = "SidebarGroup"

// Sidebar Item
interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  active?: boolean
  badge?: string | number
  disabled?: boolean
  href?: string
}

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ className, children, icon, active, badge, disabled, href, onClick, ...props }, ref) => {
    const { collapsed } = useSidebar()

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return
      if (href) {
        window.location.href = href
      }
      onClick?.(e)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer",
          "text-sm transition-colors duration-150",
          active
            ? "bg-[#1B1B1D] text-[#03AAC7]"
            : "text-[#9CA3AF] hover:bg-[#1B1B1D] hover:text-white",
          disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-[#9CA3AF]",
          collapsed && "justify-center px-2",
          className
        )}
        onClick={handleClick}
        role="button"
        aria-disabled={disabled}
        {...props}
      >
        {icon && (
          <span className={cn(
            "flex-shrink-0 w-5 h-5 flex items-center justify-center",
            active ? "text-[#03AAC7]" : "opacity-70"
          )}>
            {icon}
          </span>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{children}</span>
            {badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#2B2F36] text-[#9CA3AF] rounded">
                {badge}
              </span>
            )}
          </>
        )}
      </div>
    )
  }
)
SidebarItem.displayName = "SidebarItem"

// Sidebar Divider
const SidebarDivider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-px my-2 mx-3 bg-[#2B2F36]", className)}
    {...props}
  />
))
SidebarDivider.displayName = "SidebarDivider"

// Sidebar Toggle Button
interface SidebarToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SidebarToggle = React.forwardRef<HTMLButtonElement, SidebarToggleProps>(
  ({ className, ...props }, ref) => {
    const { collapsed, setCollapsed } = useSidebar()

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg",
          "text-[#9CA3AF] hover:text-white hover:bg-[#252629]",
          "transition-colors duration-150",
          className
        )}
        onClick={() => setCollapsed(!collapsed)}
        {...props}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5 rotate-180" />
        )}
      </button>
    )
  }
)
SidebarToggle.displayName = "SidebarToggle"

// Sidebar User Card (for header/footer)
interface SidebarUserProps {
  name: string
  email?: string
  avatar?: string
  className?: string
}

const SidebarUser = ({ name, email, avatar, className }: SidebarUserProps) => {
  const { collapsed } = useSidebar()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="w-9 h-9 rounded-lg bg-[#252629] border border-[#2B2F36] flex items-center justify-center overflow-hidden flex-shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-[#9CA3AF]">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          {email && (
            <p className="text-xs text-[#6B7280] truncate">{email}</p>
          )}
        </div>
      )}
    </div>
  )
}

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarItem,
  SidebarDivider,
  SidebarToggle,
  SidebarUser,
  useSidebar,
}
