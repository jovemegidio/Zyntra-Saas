"use client"

import Image from "next/image"
import Link from "next/link"
import { RefreshCw, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface ModuleHeaderProps {
  breadcrumbs?: BreadcrumbItem[]
  userName?: string
  onRefresh?: () => void
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "Bom dia"
  if (hour >= 12 && hour < 18) return "Boa tarde"
  return "Boa noite"
}

export function ModuleHeader({ 
  breadcrumbs = [], 
  userName = "Antônio",
  onRefresh 
}: ModuleHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-900 px-4">
      <div className="flex items-center gap-4">
        {/* Logos */}
        <div className="flex items-center gap-3">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo%20Monocromatico%20-%20Branco%20-%20Aluforce%20copy-sWn0txfEuRmbBHzXDvkqazf21WSuSZ.webp"
            alt="Aluforce"
            width={100}
            height={28}
            className="h-7 w-auto object-contain"
          />
          <div className="h-5 w-px bg-slate-600" />
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zyntra-branco-ifg8o2ak8nb52GdG4rSLuZVPOFFDQi.png"
            alt="Zyntra"
            width={100}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <>
            <div className="h-5 w-px bg-slate-600" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <BreadcrumbItem key={index}>
                    {index > 0 && <BreadcrumbSeparator className="text-slate-500" />}
                    {item.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={item.href} className="text-slate-400 hover:text-white">
                          {item.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-white font-medium">
                        {item.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
        <div className="ml-2 flex items-center gap-2 text-sm text-white">
          <span className="text-slate-400">{getGreeting()},</span>
          <span className="font-semibold">{userName}</span>
        </div>
      </div>
    </header>
  )
}
