import { ReactNode } from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ContentCardProps {
  icon?: LucideIcon
  iconClassName?: string
  title?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function ContentCard({
  icon: Icon,
  iconClassName,
  title,
  actions,
  children,
  className,
  contentClassName,
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <Icon className={cn("h-5 w-5 text-blue-600", iconClassName)} />
            )}
            {title && (
              <h3 className="font-semibold text-slate-900">{title}</h3>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </div>
  )
}
