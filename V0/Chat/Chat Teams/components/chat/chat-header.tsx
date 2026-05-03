"use client"

import { Hash, Pin, Bell, Users, Search, Phone, Video, MoreHorizontal } from "lucide-react"

interface ChatHeaderProps {
  channel: string
  description: string
  onlineCount: number
  membersCount: number
}

export function ChatHeader({ channel, description, onlineCount, membersCount }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-5 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-border">
          <Hash className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
              #{channel}
            </h1>
            <button
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Fixar canal"
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="mr-2 hidden items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 ring-1 ring-primary/20 md:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] font-medium text-primary">
            {onlineCount} online
          </span>
        </div>

        <HeaderButton label="Buscar">
          <Search className="h-4 w-4" />
        </HeaderButton>
        <HeaderButton label="Iniciar chamada">
          <Phone className="h-4 w-4" />
        </HeaderButton>
        <HeaderButton label="Iniciar vídeo">
          <Video className="h-4 w-4" />
        </HeaderButton>
        <HeaderButton label="Notificações">
          <Bell className="h-4 w-4" />
        </HeaderButton>
        <HeaderButton label="Membros">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">{membersCount}</span>
          </div>
        </HeaderButton>
        <HeaderButton label="Mais opções">
          <MoreHorizontal className="h-4 w-4" />
        </HeaderButton>
      </div>
    </header>
  )
}

function HeaderButton({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className="flex h-8 items-center justify-center rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}
