"use client"

import Image from "next/image"
import { Search, Settings, HelpCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/zyntra-branco-ifg8o2ak8nb52GdG4rSLuZVPOFFDQi.png"
            alt="Zyntra"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
          />
        </div>
        <span className="text-white/50">×</span>
        <div className="flex items-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo%20Monocromatico%20-%20Branco%20-%20Aluforce%20copy-sWn0txfEuRmbBHzXDvkqazf21WSuSZ.webp"
            alt="Aluforce"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <Search className="h-5 w-5" />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <Settings className="h-5 w-5" />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="mx-2 h-8 w-px bg-white/20" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-full py-1 pl-1 pr-4 transition-colors hover:bg-white/10">
              <Avatar className="h-9 w-9 border-2 border-white/30">
                <AvatarImage 
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon.ico-DTeVOXSNGzKEEE8EAIjTxPlG0yJ7e8.png" 
                  alt="Antônio" 
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                  A
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-white">Antônio</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Meu Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configurações</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
