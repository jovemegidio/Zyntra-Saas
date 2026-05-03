"use client"

import { useState } from "react"
import { Sidebar } from "@/components/chat/sidebar"
import { ChatHeader } from "@/components/chat/chat-header"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"

const channelInfo: Record<
  string,
  { description: string; online: number; members: number }
> = {
  geral: {
    description: "Canal geral da empresa — todos os colaboradores",
    online: 12,
    members: 59,
  },
  comercial: {
    description: "Time comercial — leads, propostas e fechamentos",
    online: 4,
    members: 14,
  },
  financeiro: {
    description: "Financeiro — fluxo de caixa, fechamentos e relatórios",
    online: 3,
    members: 8,
  },
  pop: {
    description: "Procedimentos operacionais padrão da empresa",
    online: 2,
    members: 22,
  },
  rh: {
    description: "Recursos Humanos — vagas, benefícios e cultura",
    online: 5,
    members: 11,
  },
  ti: {
    description: "Tecnologia da Informação — suporte e infraestrutura",
    online: 6,
    members: 9,
  },
}

export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState("geral")
  const info = channelInfo[activeChannel] ?? channelInfo.geral

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        activeChannel={activeChannel}
        onSelectChannel={setActiveChannel}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          channel={activeChannel}
          description={info.description}
          onlineCount={info.online}
          membersCount={info.members}
        />
        <MessageList
          channel={activeChannel}
          description={info.description}
        />
        <MessageInput channel={activeChannel} />
      </section>
    </main>
  )
}
