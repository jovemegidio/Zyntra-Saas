"use client"

import { useState } from "react"
import {
  Paperclip,
  Smile,
  Mic,
  Send,
  Bold,
  Italic,
  Code,
  Link2,
  AtSign,
  Image as ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageInputProps {
  channel: string
}

export function MessageInput({ channel }: MessageInputProps) {
  const [value, setValue] = useState("")
  const canSend = value.trim().length > 0

  return (
    <div className="px-5 pb-5 pt-2">
      <div className="mx-auto max-w-3xl">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSend) setValue("")
          }}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_oklch(0.72_0.15_165_/_0.08)]"
        >
          {/* Formatting toolbar */}
          <div className="flex items-center gap-0.5 border-b border-border/60 px-2 py-1.5">
            <FormatButton label="Negrito">
              <Bold className="h-3.5 w-3.5" />
            </FormatButton>
            <FormatButton label="Itálico">
              <Italic className="h-3.5 w-3.5" />
            </FormatButton>
            <FormatButton label="Código">
              <Code className="h-3.5 w-3.5" />
            </FormatButton>
            <span className="mx-1 h-4 w-px bg-border" />
            <FormatButton label="Link">
              <Link2 className="h-3.5 w-3.5" />
            </FormatButton>
            <FormatButton label="Mencionar">
              <AtSign className="h-3.5 w-3.5" />
            </FormatButton>
            <FormatButton label="Imagem">
              <ImageIcon className="h-3.5 w-3.5" />
            </FormatButton>
            <div className="ml-auto text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-background/50 px-1 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>{" "}
              para enviar ·{" "}
              <kbd className="rounded border border-border bg-background/50 px-1 py-0.5 font-mono text-[10px]">
                Shift + Enter
              </kbd>{" "}
              nova linha
            </div>
          </div>

          {/* Input area */}
          <div className="flex items-end gap-2 px-3 py-2.5">
            <button
              type="button"
              aria-label="Anexar arquivo"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Mensagem em #${channel}`}
              rows={1}
              className="scrollbar-thin max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`
              }}
            />

            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label="Emoji"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Smile className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Gravar áudio"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Enviar mensagem"
                className={cn(
                  "ml-1 flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                  canSend
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                    : "cursor-not-allowed bg-secondary text-muted-foreground",
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>

        <p className="mt-2 text-center text-[10px] text-muted-foreground/70">
          As mensagens são criptografadas e armazenadas com segurança no
          workspace.
        </p>
      </div>
    </div>
  )
}

function FormatButton({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}
