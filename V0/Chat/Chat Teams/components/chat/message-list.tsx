"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Smile, Reply, MoreHorizontal, ThumbsUp, Heart, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id: string
  author: string
  role: string
  initials: string
  time: string
  content: string
  reactions?: { emoji: string; count: number; mine?: boolean }[]
  pinned?: boolean
}

const messages: Message[] = [
  {
    id: "1",
    author: "Júnior",
    role: "Financeiro",
    initials: "JR",
    time: "09:12",
    content:
      "Bom dia, pessoal! Já enviei o relatório de fechamento de outubro para a planilha compartilhada. Qualquer dúvida, é só chamar.",
    reactions: [
      { emoji: "👍", count: 4, mine: true },
      { emoji: "🎉", count: 2 },
    ],
  },
  {
    id: "2",
    author: "Fabiano",
    role: "Comercial",
    initials: "FB",
    time: "09:24",
    content:
      "Boa, Júnior! Aproveitando, hoje às 15h teremos a apresentação da nova proposta para o cliente Aurora. Quem puder participar, será ótimo.",
  },
  {
    id: "3",
    author: "BOB I.A.",
    role: "Assistente",
    initials: "IA",
    time: "09:25",
    content:
      "Adicionei o evento à agenda da equipe: **Apresentação Aurora** — hoje, 15:00–16:00. Posso preparar um resumo dos pontos principais antes da reunião?",
  },
  {
    id: "4",
    author: "Antônio",
    role: "TI",
    initials: "AN",
    time: "09:31",
    content:
      "Perfeito, BOB. Manda também o link da sala de reuniões assim que abrir, por favor.",
    reactions: [{ emoji: "✅", count: 1 }],
  },
]

interface MessageListProps {
  channel: string
  description: string
}

export function MessageList({ channel, description }: MessageListProps) {
  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Welcome / channel intro */}
        <div className="mb-8 rounded-2xl border border-border/60 bg-card/40 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <span className="text-lg font-bold">#</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            Bem-vindo a #{channel}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {description} Este é o início da conversa. Diga olá! 👋
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Tag>Criado em 12 jan 2024</Tag>
            <Tag>Apenas leitura para visitantes</Tag>
            <Tag>Notificações ativadas</Tag>
          </div>
        </div>

        {/* Date divider */}
        <DateDivider label="Hoje" />

        {/* Messages */}
        <ul className="space-y-1">
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const grouped = prev && prev.author === m.author
            return (
              <MessageItem key={m.id} message={m} grouped={grouped} />
            )
          })}
        </ul>

        {/* Typing indicator */}
        <div className="mt-4 flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Dot />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </div>
          <span>
            <span className="font-medium text-foreground">Fabiano</span> está
            digitando…
          </span>
        </div>
      </div>
    </div>
  )
}

function MessageItem({
  message,
  grouped,
}: {
  message: Message
  grouped?: boolean
}) {
  const isAI = message.author === "BOB I.A."
  return (
    <li
      className={cn(
        "group relative flex gap-3 rounded-lg px-2 transition-colors hover:bg-accent/30",
        grouped ? "py-0.5" : "py-2",
      )}
    >
      <div className="w-9 shrink-0 pt-0.5">
        {!grouped ? (
          <Avatar
            className={cn(
              "h-9 w-9",
              isAI && "ring-1 ring-primary/40",
            )}
          >
            <AvatarImage
              src={`/.jpg?height=36&width=36&query=${message.author} ${
                isAI ? "AI assistant" : "professional avatar"
              }`}
              alt={message.author}
            />
            <AvatarFallback
              className={cn(
                "text-xs font-semibold",
                isAI
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {message.initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="block pt-0.5 text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground">
            {message.time}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {message.author}
            </span>
            {isAI && (
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                IA
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {message.role}
            </span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              {message.time}
            </span>
          </div>
        )}

        <p
          className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
          dangerouslySetInnerHTML={{
            __html: message.content.replace(
              /\*\*(.+?)\*\*/g,
              '<strong class="font-semibold text-foreground">$1</strong>',
            ),
          }}
        />

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((r, i) => (
              <button
                key={i}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                  r.mine
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/20"
                    : "bg-accent text-foreground/80 ring-1 ring-border hover:bg-accent/80",
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {message.author === "Antônio" && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <CheckCheck className="h-3 w-3 text-primary" />
            Lido por 4
          </div>
        )}
      </div>

      {/* Hover toolbar */}
      <div className="absolute -top-3 right-3 hidden items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-lg group-hover:flex">
        <ToolbarButton label="Reagir">
          <Smile className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Curtir">
          <ThumbsUp className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Amei">
          <Heart className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Responder">
          <Reply className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Mais">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
    </li>
  )
}

function ToolbarButton({
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
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="rounded-full border border-border bg-card px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
      {children}
    </span>
  )
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: delay, animationDuration: "1s" }}
    />
  )
}
