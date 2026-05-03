export type UserStatus = "online" | "away" | "offline"

export interface ChatUser {
  id: number | string
  name: string
  role?: string | null
  status?: UserStatus
}

export interface Channel {
  id: number
  slug: string
  name: string
  description: string | null
  unread?: number
  mention?: boolean
}

export interface MessageReaction {
  emoji: string
  count: number
  mine?: boolean
}

export interface ChatMessage {
  id: number
  channelId: number
  userId: number | string
  author: string
  role?: string | null
  content: string
  createdAt: string // ISO
  reactions: MessageReaction[]
}
