"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"
import { ModuleCard } from "./module-card"

const modules = [
  { title: "Compras", icon: "compras" as const, gradient: "bg-gradient-to-br from-blue-400 to-blue-600" },
  { title: "Vendas", icon: "vendas" as const, gradient: "bg-gradient-to-br from-indigo-500 to-indigo-700" },
  { title: "Faturamento", icon: "faturamento" as const, gradient: "bg-gradient-to-br from-teal-400 to-teal-600" },
  { title: "Logística", icon: "logistica" as const, gradient: "bg-gradient-to-br from-emerald-400 to-emerald-600" },
  { title: "PCP", icon: "pcp" as const, gradient: "bg-gradient-to-br from-rose-400 to-rose-600" },
  { title: "Financeiro", icon: "financeiro" as const, gradient: "bg-gradient-to-br from-lime-400 to-lime-600" },
  { title: "Recursos Humanos", icon: "rh" as const, gradient: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600" },
]

const quotes = [
  "Grandes conquistas exigem grandes esforços.",
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Transforme seus sonhos em metas e suas metas em conquistas.",
  "A excelência não é um ato, mas um hábito.",
]

export function WelcomeSection() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [quote, setQuote] = useState(quotes[0])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    setQuote(quotes[Math.floor(Math.random() * quotes.length)])

    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="relative z-10 flex flex-1 flex-col px-8 py-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">
            {mounted && currentTime ? formatDate(currentTime) : "\u00A0"}
          </p>
          <h1 className="mt-2 text-4xl font-bold text-white drop-shadow-lg md:text-5xl">
            Olá, Antônio
          </h1>
          <p className="mt-2 text-lg text-white/90 drop-shadow-md">{quote}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg">
          <Clock className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">
            {mounted && currentTime ? formatTime(currentTime) : "--:--"}
          </span>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
        {modules.map((module) => (
          <ModuleCard
            key={module.title}
            title={module.title}
            icon={module.icon}
            gradient={module.gradient}
          />
        ))}
      </div>
    </div>
  )
}
