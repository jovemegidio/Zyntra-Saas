"use client"

import { useState } from "react"
import {
  Search,
  Plus,
  Hash,
  Sparkles,
  ChevronDown,
  Settings,
  X,
  MessageSquarePlus,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type Channel = {
  id: string
  name: string
  unread?: number
  mention?: boolean
}

type DirectMessage = {
  id: string
  name: string
  role: string
  status: "online" | "away" | "offline"
  avatar?: string
  initials: string
}

const channels: Channel[] = [
  { id: "comercial", name: "comercial" },
  { id: "financeiro", name: "financeiro", unread: 3 },
  { id: "geral", name: "geral" },
  { id: "pop", name: "pop" },
  { id: "rh", name: "rh", unread: 1, mention: true },
  { id: "ti", name: "ti" },
]

const directMessages: DirectMessage[] = [
  {
    id: "junior",
    name: "Júnior",
    role: "Financeiro",
    status: "online",
    initials: "JR",
  },
  {
    id: "fabiano",
    name: "Fabiano",
    role: "Comercial",
    status: "away",
    initials: "FB",
  },
  {
    id: "jamerson",
    name: "Jamerson",
    role: "Consultoria",
    status: "offline",
    initials: "JM",
  },
]

const statusColor: Record<DirectMessage["status"], string> = {
  online: "bg-primary",
  away: "bg-amber-400",
  offline: "bg-muted-foreground/40",
}

interface SidebarProps {
  activeChannel: string
  onSelectChannel: (id: string) => void
  onClose?: () => void
}

export function Sidebar({ activeChannel, onSelectChannel, onClose }: SidebarProps) {
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)

  return (
    <aside className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Workspace header */}
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            >
              <path
                d="M4 7L12 3L20 7L12 11L4 7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M4 12L12 16L20 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M4 17L12 21L20 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Zyntra</span>
            <span className="text-[10px] text-muted-foreground">Workspace</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="group relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar pessoas ou canais"
            className="w-full rounded-lg bg-sidebar-accent/60 py-2 pl-8 pr-12 text-xs text-sidebar-foreground placeholder:text-muted-foreground/80 ring-1 ring-transparent transition-all focus:bg-sidebar-accent focus:outline-none focus:ring-primary/40"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border/60 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        {/* Assistente */}
        <SectionLabel>Assistente</SectionLabel>
        <button className="group mb-1 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent">
          <div className="relative">
            <Avatar className="h-7 w-7 ring-1 ring-primary/40">
              <AvatarImage src="/abstract-ai-assistant.png" alt="BOB I.A." />
              <AvatarFallback className="bg-primary/20 text-[10px] font-semibold text-primary">
                IA
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-sidebar ring-2 ring-sidebar">
              <Sparkles className="h-2 w-2 text-primary" />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start text-left">
            <span className="text-sm font-medium">BOB I.A.</span>
            <span className="truncate text-[11px] text-muted-foreground">
              Assistente Virtual • TI
            </span>
          </div>
          <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            Beta
          </span>
        </button>

        {/* Canais */}
        <SectionHeader
          label="Canais"
          open={channelsOpen}
          onToggle={() => setChannelsOpen(!channelsOpen)}
          action={
            <button
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Adicionar canal"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        />
        {channelsOpen && (
          <ul className="mb-2 space-y-0.5">
            {channels.map((c) => {
              const active = c.id === activeChannel
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelectChannel(c.id)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-primary/15 text-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <Hash
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 truncate text-left",
                        active && "font-medium text-foreground",
                      )}
                    >
                      {c.name}
                    </span>
                    {c.unread ? (
                      <span
                        className={cn(
                          "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                          c.mention
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-sidebar-accent text-sidebar-foreground",
                        )}
                      >
                        {c.unread}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Mensagens diretas */}
        <SectionHeader
          label="Mensagens diretas"
          open={dmsOpen}
          onToggle={() => setDmsOpen(!dmsOpen)}
          action={
            <button
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Nova mensagem direta"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </button>
          }
        />
        {dmsOpen && (
          <ul className="space-y-0.5">
            {directMessages.map((dm) => (
              <li key={dm.id}>
                <button className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={`/.jpg?height=28&width=28&query=${dm.name} avatar portrait`}
                        alt={dm.name}
                      />
                      <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                        {dm.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar",
                        statusColor[dm.status],
                      )}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">
                      {dm.name}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {dm.role}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Ver todos */}
        <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sidebar-border bg-sidebar-accent/30 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-sidebar-accent hover:text-foreground">
          <ChevronDown className="h-3 w-3" />
          Ver todos (59)
        </button>
      </div>

      {/* User profile */}
      <UserProfile />
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
      {children}
    </div>
  )
}

function SectionHeader({
  label,
  open,
  onToggle,
  action,
}: {
  label: string
  open: boolean
  onToggle: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-1 px-1">
      <button
        onClick={onToggle}
        className="group flex flex-1 items-center gap-1 px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 transition-colors hover:text-sidebar-foreground"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            !open && "-rotate-90",
          )}
        />
        {label}
      </button>
      {action}
    </div>
  )
}

function UserProfile() {
  return (
    <div className="flex items-center gap-2.5 border-t border-sidebar-border bg-sidebar/80 px-3 py-2.5 backdrop-blur">
      <div className="relative">
        <Avatar className="h-9 w-9 ring-1 ring-border">
          <AvatarImage src="/.jpg?height=36&width=36&query=Antonio professional avatar" alt="Antônio" />
          <AvatarFallback className="bg-secondary text-xs font-semibold">
            AN
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-sidebar" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">Antônio</span>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground">Online · TI</span>
        </div>
      </div>
      <button
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        aria-label="Configurações"
      >
        <Settings className="h-4 w-4" />
      </button>
    </div>
  )
}
