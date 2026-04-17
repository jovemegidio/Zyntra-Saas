import Link from "next/link";
import {
  Landmark,
  ShieldCheck,
  Zap,
  Clock,
  QrCode,
  ArrowUpDown,
  FileText,
  Lock,
  Globe,
  Smartphone,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "#ffffff" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(227,6,19,0.08)" }}>
              <Landmark className="h-4.5 w-4.5 text-red-600" />
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">
              Glory<span className="text-red-600">Bank</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-xl px-5 py-2 text-[13px] font-medium text-white transition-all duration-200 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #cc0511, #e30613)" }}
            >
              Abrir conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden" style={{ background: "linear-gradient(180deg, #e30613 0%, #cc0511 100%)" }}>
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <ShieldCheck className="h-3.5 w-3.5 text-white" />
            <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Internet Banking Seguro</span>
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight leading-tight mb-6">
            O banco digital que{" "}
            <span className="text-white/80">simplifica</span> suas finanças
          </h1>
          <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
            PIX instantâneo, boletos, transferências e gestão financeira completa.
            Tudo em um só lugar, com segurança de nível bancário.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-semibold text-red-600 bg-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
            >
              Abrir minha conta
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-medium text-white transition-all duration-200 hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.3)" }}
            >
              Acessar conta
            </Link>
          </div>

          {/* Demo banner */}
          <div className="mt-8 inline-flex items-center justify-center gap-4 rounded-2xl px-6 py-4 text-sm max-w-lg w-full" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
            <div className="text-left flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white mb-1">🧪 Acesso Demonstração</p>
              <p className="text-[12px] text-white/70">
                <span className="font-mono text-white">demo@glorybank.com</span>
                {" "}·{" "}
                <span className="font-mono text-white">Demo@123456</span>
              </p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-xl px-4 py-2 text-[12px] font-semibold text-red-600 bg-white transition-opacity hover:opacity-80"
            >
              Acessar Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "PIX", label: "Instantâneo" },
            { value: "24/7", label: "Disponível" },
            { value: "0%", label: "Taxa PIX" },
            { value: "256-bit", label: "Criptografia" },
          ].map((stat) => (
            <div key={stat.label} className="text-center rounded-xl py-6 px-4" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <p className="text-2xl font-bold text-red-600 mb-1">{stat.value}</p>
              <p className="text-[12px] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6" style={{ background: "#f5f6f8" }}>
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              Tudo que você precisa em um banco
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Funcionalidades completas para gerenciar suas finanças pessoais e empresariais
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: QrCode, title: "PIX Instantâneo", desc: "Envie e receba pagamentos via PIX em segundos, sem taxas para pessoas físicas.", color: "text-red-500", bg: "rgba(227,6,19,0.08)" },
              { icon: ArrowUpDown, title: "Transferências", desc: "Realize transferências entre contas de forma rápida e segura via PIX ou TED.", color: "text-blue-500", bg: "rgba(59,130,246,0.08)" },
              { icon: FileText, title: "Boletos", desc: "Gere boletos de cobrança com código de barras e acompanhe pagamentos em tempo real.", color: "text-purple-500", bg: "rgba(168,85,247,0.08)" },
              { icon: Lock, title: "Segurança Total", desc: "Criptografia AES-256, autenticação segura e proteção contra fraudes 24 horas.", color: "text-red-400", bg: "rgba(239,68,68,0.08)" },
              { icon: Globe, title: "100% Digital", desc: "Acesse sua conta de qualquer lugar, a qualquer momento, direto do seu navegador.", color: "text-amber-500", bg: "rgba(245,158,11,0.08)" },
              { icon: Smartphone, title: "Interface Moderna", desc: "Design intuitivo inspirado nos melhores bancos digitais do mercado.", color: "text-cyan-500", bg: "rgba(6,182,212,0.08)" },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02]" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${feature.color}`} style={{ background: feature.bg }}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl rounded-2xl p-10 text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #e30613 0%, #cc0511 100%)" }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />
          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Segurança de Nível Bancário
            </h2>
            <p className="text-white/70 max-w-lg mx-auto mb-8 leading-relaxed">
              Utilizamos criptografia de ponta a ponta, tokens JWT seguros, rate limiting
              e as melhores práticas de segurança do mercado financeiro.
            </p>
            <div className="flex items-center justify-center gap-6 text-[13px]">
              {["Criptografia AES-256", "JWT Httponly", "Rate Limiting", "OWASP Top 10"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-white/80">
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center" style={{ background: "#f5f6f8" }}>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          Pronto para começar?
        </h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Abra sua conta em poucos minutos e comece a usar todas as funcionalidades.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl px-10 py-4 text-[15px] font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #cc0511, #e30613)", boxShadow: "0 8px 32px rgba(227,6,19,0.25)" }}
        >
          Criar minha conta grátis
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-slate-600">
              Glory<span className="text-red-600">Bank</span>
            </span>
          </div>
          <p className="text-[12px] text-slate-400">
            &copy; {new Date().getFullYear()} GloryBank. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
