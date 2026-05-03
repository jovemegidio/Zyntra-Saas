"use client"

import { MessageSquare } from "lucide-react"

export function ChatButton() {
  return (
    <button className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl">
      <MessageSquare className="h-6 w-6" />
    </button>
  )
}
