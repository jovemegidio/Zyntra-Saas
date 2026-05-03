"use client"

import { Check, Palette } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { THEMES, useTheme, type ThemeId } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const SWATCHES: Record<ThemeId, { bg: string; primary: string; ring: string }> = {
  dark: {
    bg: "bg-[oklch(0.18_0.012_250)]",
    primary: "bg-[oklch(0.72_0.15_165)]",
    ring: "ring-[oklch(0.27_0.014_250)]",
  },
  "blue-dark": {
    bg: "bg-[oklch(0.20_0.05_255)]",
    primary: "bg-[oklch(0.68_0.18_250)]",
    ring: "ring-[oklch(0.30_0.06_255)]",
  },
  "blue-light": {
    bg: "bg-[oklch(0.97_0.02_240)]",
    primary: "bg-[oklch(0.55_0.20_250)]",
    ring: "ring-[oklch(0.85_0.04_240)]",
  },
  light: {
    bg: "bg-[oklch(1_0_0)]",
    primary: "bg-[oklch(0.45_0.02_250)]",
    ring: "ring-[oklch(0.90_0.005_250)]",
  },
}

interface ThemeSwitcherProps {
  variant?: "icon" | "compact"
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

export function ThemeSwitcher({
  variant = "icon",
  align = "end",
  side = "top",
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Trocar tema"
          title="Trocar tema"
          className={cn(
            "flex items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            variant === "icon" ? "h-8 w-8 justify-center" : "px-2 py-1.5",
          )}
        >
          <Palette className="h-4 w-4" />
          {variant === "compact" && (
            <span className="text-xs font-medium">Tema</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-56">
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Aparência
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((t) => {
          const swatch = SWATCHES[t.id]
          const active = theme === t.id
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="flex items-center gap-3 py-2"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
                  swatch.bg,
                  swatch.ring,
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", swatch.primary)} />
              </span>
              <span className="flex-1 text-sm">{t.label}</span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
