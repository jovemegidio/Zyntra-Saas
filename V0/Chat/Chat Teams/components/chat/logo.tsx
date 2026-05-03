import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  /**
   * Caminho da imagem da logo. Substitua /public/zyntra-logo.svg pela
   * logo oficial do Zyntra (PNG ou SVG). Mantenha o mesmo nome de arquivo
   * ou ajuste o `src` aqui.
   */
  src?: string
  alt?: string
  size?: number
}

export function Logo({
  className,
  src = "/zyntra-logo.svg",
  alt = "Zyntra",
  size = 28,
}: LogoProps) {
  return (
    <img
      src={src || "/placeholder.svg"}
      alt={alt}
      width={size}
      height={size}
      className={cn("block h-auto w-auto select-none", className)}
      style={{ maxHeight: size }}
      draggable={false}
    />
  )
}
