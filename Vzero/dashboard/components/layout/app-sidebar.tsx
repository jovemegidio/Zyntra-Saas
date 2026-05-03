"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Target,
  BarChart3,
  FileText,
  Percent,
  Package,
  Truck,
  DollarSign,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string | number
}

const mainNavItems: NavItem[] = [
  { label: "Início", href: "/", icon: Home },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pedidos", href: "/pedidos", icon: ShoppingCart },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Metas", href: "/metas", icon: Target },
  { label: "Gráficos", href: "/graficos", icon: BarChart3 },
  { label: "Relatórios", href: "/relatorios", icon: FileText },
  { label: "Descontos", href: "/descontos", icon: Percent },
]

const moduleNavItems: NavItem[] = [
  { label: "Produtos", href: "/produtos", icon: Package },
  { label: "Logística", href: "/logistica", icon: Truck },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
]

interface AppSidebarProps {
  items?: NavItem[]
  secondaryItems?: NavItem[]
  className?: string
}

export function AppSidebar({ 
  items = mainNavItems, 
  secondaryItems = moduleNavItems,
  className 
}: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen w-16 flex-col bg-slate-900 text-white",
          className
        )}
      >
        {/* Main Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1 py-4">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.badge && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* Divider */}
          {secondaryItems && secondaryItems.length > 0 && (
            <div className="my-2 h-px w-8 bg-slate-700" />
          )}

          {/* Secondary Navigation */}
          {secondaryItems?.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
