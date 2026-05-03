"use client"

import { useState, useEffect } from "react"

const backgrounds = [
  "/backgrounds/bg-1.jpg",
  "/backgrounds/bg-2.jpg",
  "/backgrounds/bg-3.jpg",
  "/backgrounds/bg-4.jpg",
]

export function AnimatedBackground() {
  const [currentBg, setCurrentBg] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgrounds.length)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {backgrounds.map((bg, index) => (
        <div
          key={bg}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ease-in-out"
          style={{
            backgroundImage: `url(${bg})`,
            opacity: index === currentBg ? 1 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
    </>
  )
}
