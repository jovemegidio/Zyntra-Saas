"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

export type ThemeId = "dark" | "blue-dark" | "blue-light" | "light"

export const THEMES: { id: ThemeId; label: string; isDark: boolean }[] = [
  { id: "dark", label: "Preto", isDark: true },
  { id: "blue-dark", label: "Azul", isDark: true },
  { id: "blue-light", label: "Azul claro", isDark: false },
  { id: "light", label: "Branco", isDark: false },
]

const STORAGE_KEY = "zyntra-theme"
const DEFAULT_THEME: ThemeId = "dark"

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function applyThemeToDom(theme: ThemeId) {
  const root = document.documentElement
  root.setAttribute("data-theme", theme)
  const isDark = THEMES.find((t) => t.id === theme)?.isDark ?? true
  root.classList.toggle("dark", isDark)
  root.style.colorScheme = isDark ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null
      const next =
        saved && THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME
      setThemeState(next)
      applyThemeToDom(next)
    } catch {
      applyThemeToDom(DEFAULT_THEME)
    }
  }, [])

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
    applyThemeToDom(t)
    try {
      window.localStorage.setItem(STORAGE_KEY, t)
    } catch {
      // ignore
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  return ctx
}

/**
 * Script inline executado antes do React hidratar para evitar
 * o "flash" do tema padrão. Deve ser injetado no <head>.
 */
export const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}') || '${DEFAULT_THEME}';
    var dark = (t === 'dark' || t === 'blue-dark');
    document.documentElement.setAttribute('data-theme', t);
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.setAttribute('data-theme', '${DEFAULT_THEME}');
    document.documentElement.classList.add('dark');
  }
})();
`.trim()
