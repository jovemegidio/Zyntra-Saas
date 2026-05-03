"use client"

import { cn } from "@/lib/utils"
import {
  ShoppingCart,
  TrendingUp,
  FileText,
  Truck,
  Cog,
  DollarSign,
  Users,
} from "lucide-react"

interface ModuleCardProps {
  title: string
  icon: "compras" | "vendas" | "faturamento" | "logistica" | "pcp" | "financeiro" | "rh"
  gradient: string
  onClick?: () => void
}

const iconMap = {
  compras: ShoppingCart,
  vendas: TrendingUp,
  faturamento: FileText,
  logistica: Truck,
  pcp: Cog,
  financeiro: DollarSign,
  rh: Users,
}

export function ModuleCard({ title, icon, gradient, onClick }: ModuleCardProps) {
  const Icon = iconMap[icon]

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex h-28 w-28 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl",
        gradient
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-xs font-semibold tracking-wide">{title}</span>
    </button>
  )
}
