"use client"

import { ReactNode } from "react"
import { AppSidebar, type NavItem } from "./app-sidebar"
import { ModuleHeader, type BreadcrumbItem } from "./module-header"
import { ChatButton } from "@/components/dashboard/chat-button"

interface ModuleLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  userName?: string
  sidebarItems?: NavItem[]
  secondarySidebarItems?: NavItem[]
  onRefresh?: () => void
}

export function ModuleLayout({
  children,
  breadcrumbs = [],
  userName = "Antônio",
  sidebarItems,
  secondarySidebarItems,
  onRefresh,
}: ModuleLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <AppSidebar items={sidebarItems} secondaryItems={secondarySidebarItems} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <ModuleHeader
          breadcrumbs={breadcrumbs}
          userName={userName}
          onRefresh={onRefresh}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>

      {/* Chat Button */}
      <ChatButton />
    </div>
  )
}
