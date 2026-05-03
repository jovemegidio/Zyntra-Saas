import { AnimatedBackground } from "@/components/dashboard/animated-background"
import { Header } from "@/components/dashboard/header"
import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { ChatButton } from "@/components/dashboard/chat-button"

export default function DashboardPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <AnimatedBackground />
      <Header />
      <WelcomeSection />
      <ChatButton />
    </div>
  )
}
