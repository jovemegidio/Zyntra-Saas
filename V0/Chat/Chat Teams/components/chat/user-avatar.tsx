"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function getInitials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface UserAvatarProps {
  userId?: number | string | null
  name: string
  /** Sobrescreve a URL automática (ex: BOB I.A. usa /bob-avatar.png) */
  src?: string
  className?: string
  fallbackClassName?: string
}

/**
 * Avatar do usuário. Por padrão, busca a foto em /api/users/:id/avatar
 * (endpoint do sistema existente). Se a imagem falhar ou o userId não for
 * informado, exibe as iniciais como fallback automático.
 */
export function UserAvatar({
  userId,
  name,
  src,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const url = src ?? (userId != null ? `/api/users/${userId}/avatar` : undefined)

  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {url && <AvatarImage src={url || "/placeholder.svg"} alt={name} />}
      <AvatarFallback
        className={cn(
          "bg-secondary text-xs font-semibold text-secondary-foreground",
          fallbackClassName,
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
