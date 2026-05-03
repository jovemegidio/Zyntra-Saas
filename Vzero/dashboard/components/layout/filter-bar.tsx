"use client"

import { ReactNode } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FilterBarProps {
  children: ReactNode
  onFilter?: () => void
  filterLabel?: string
  className?: string
}

export function FilterBar({
  children,
  onFilter,
  filterLabel = "Filtrar",
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200",
        className
      )}
    >
      {children}
      {onFilter && (
        <Button onClick={onFilter} className="bg-blue-600 hover:bg-blue-700">
          <Search className="mr-2 h-4 w-4" />
          {filterLabel}
        </Button>
      )}
    </div>
  )
}
