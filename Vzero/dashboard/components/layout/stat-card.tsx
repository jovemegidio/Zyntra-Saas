import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type ColorVariant = "blue" | "green" | "purple" | "orange" | "red" | "teal"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtitle?: string
  color?: ColorVariant
  className?: string
}

const colorStyles: Record<ColorVariant, { border: string; icon: string; bg: string }> = {
  blue: {
    border: "border-t-blue-500",
    icon: "text-blue-600 bg-blue-50",
    bg: "bg-white",
  },
  green: {
    border: "border-t-green-500",
    icon: "text-green-600 bg-green-50",
    bg: "bg-white",
  },
  purple: {
    border: "border-t-purple-500",
    icon: "text-purple-600 bg-purple-50",
    bg: "bg-white",
  },
  orange: {
    border: "border-t-orange-500",
    icon: "text-orange-600 bg-orange-50",
    bg: "bg-white",
  },
  red: {
    border: "border-t-red-500",
    icon: "text-red-600 bg-red-50",
    bg: "bg-white",
  },
  teal: {
    border: "border-t-teal-500",
    icon: "text-teal-600 bg-teal-50",
    bg: "bg-white",
  },
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = "blue",
  className,
}: StatCardProps) {
  const styles = colorStyles[color]

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 border-t-4 p-5 shadow-sm",
        styles.border,
        styles.bg,
        className
      )}
    >
      <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl", styles.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  )
}
