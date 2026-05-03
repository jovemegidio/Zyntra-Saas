import { ReactNode } from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  icon?: LucideIcon
  iconClassName?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  icon: Icon,
  iconClassName,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div className="flex items-center gap-4">
        {Icon && (
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl",
              iconClassName || "bg-blue-100 text-blue-600"
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
