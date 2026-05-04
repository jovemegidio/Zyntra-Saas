"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowUpDown,
  QrCode,
  FileText,
  Clock,
  Settings,
  LogOut,
  Landmark,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Bell,
  CalendarClock,
  CreditCard,
  Wallet,
  TrendingUp,
  Banknote,
  Package,
  Wrench,
  Receipt,
} from "lucide-react";
import { useState } from "react";

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface MenuGroup {
  category: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    category: "",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Início" },
    ],
  },
  {
    category: "Conta Corrente",
    items: [
      { href: "/dashboard/extrato", icon: Clock, label: "Extrato" },
      { href: "/dashboard/conta", icon: Settings, label: "Minha Conta" },
    ],
  },
  {
    category: "Transferências",
    items: [
      { href: "/dashboard/pix", icon: QrCode, label: "PIX" },
      { href: "/dashboard/transferir", icon: ArrowUpDown, label: "Transferir" },
    ],
  },
  {
    category: "Pagamentos e Recargas",
    items: [
      { href: "/dashboard/boleto", icon: FileText, label: "Boletos" },
      { href: "/dashboard/agendamentos", icon: CalendarClock, label: "Agendamentos" },
      { href: "/dashboard/pagamentos", icon: Receipt, label: "Pagamentos" },
    ],
  },
  {
    category: "Cartões",
    items: [
      { href: "/dashboard/cartao", icon: CreditCard, label: "Meus Cartões" },
      { href: "/dashboard/cartao/fatura", icon: Wallet, label: "Pagar Fatura" },
    ],
  },
  {
    category: "Investimentos e Poupança",
    items: [
      { href: "/dashboard/investimentos", icon: TrendingUp, label: "Investimentos" },
    ],
  },
  {
    category: "Empréstimos e Financiamentos",
    items: [
      { href: "/dashboard/emprestimos", icon: Banknote, label: "Empréstimos" },
    ],
  },
  {
    category: "Outros Produtos",
    items: [
      { href: "/dashboard/produtos", icon: Package, label: "Produtos" },
    ],
  },
  {
    category: "Utilidades",
    items: [
      { href: "/dashboard/notificacoes", icon: Bell, label: "Notificações" },
      { href: "/dashboard/utilidades", icon: Wrench, label: "Utilidades" },
    ],
  },
];

interface SidebarProps {
  mobileSidebarOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileSidebarOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300 ease-in-out",
        // Desktop: always visible, toggle width
        "lg:translate-x-0",
        collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
        // Mobile: full-width panel overlay
        "w-[280px]",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
      style={{
        background: "linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        boxShadow: mobileSidebarOpen ? "4px 0 32px rgba(0,0,0,0.5)" : undefined,
      }}
    >
      {/* Logo */}
      <div
        className="flex h-[72px] shrink-0 items-center justify-between px-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={onMobileClose}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, #e30613, #ff4d4d)",
              boxShadow: "0 4px 12px rgba(227,6,19,0.3)",
            }}
          >
            <Landmark className="h-4.5 w-4.5 text-white" strokeWidth={2} />
          </div>
          {(!collapsed || mobileSidebarOpen) && (
            <div className="min-w-0">
              <span className="text-[17px] font-bold tracking-tight text-white">Glory</span>
              <span className="text-[17px] font-bold tracking-tight text-red-400">Bank</span>
            </div>
          )}
        </Link>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="flex lg:hidden rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.category && (!collapsed || mobileSidebarOpen) && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                {group.category}
              </p>
            )}
            {group.category && collapsed && !mobileSidebarOpen && gi > 0 && (
              <div className="mx-auto mb-2 h-px w-6 bg-white/[0.06]" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) ||
                  (item.href !== "/dashboard" && pathname === item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed && !mobileSidebarOpen ? item.label : undefined}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-red-600/15 text-red-300"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                      }`}
                    >
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                          isActive
                            ? "text-red-400"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      />
                      {(!collapsed || mobileSidebarOpen) && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {isActive && (!collapsed || mobileSidebarOpen) && (
                        <span
                          className="ml-auto h-1.5 w-1.5 rounded-full bg-red-400"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Security Badge */}
      {(!collapsed || mobileSidebarOpen) && (
        <div
          className="mx-3 mb-3 rounded-xl p-3"
          style={{
            background: "rgba(227,6,19,0.05)",
            border: "1px solid rgba(227,6,19,0.1)",
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              Ambiente Seguro
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-600">
            Conexão criptografada TLS 1.3
          </p>
        </div>
      )}

      {/* Collapsed security indicator */}
      {collapsed && !mobileSidebarOpen && (
        <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(227,6,19,0.08)" }}>
          <ShieldCheck className="h-4 w-4 text-red-500" />
        </div>
      )}

      {/* Logout */}
      <div
        className="px-3 pb-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={handleLogout}
          title={collapsed && !mobileSidebarOpen ? "Encerrar Sessão" : undefined}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-400/70 transition-all duration-150 hover:bg-red-500/8 hover:text-red-400"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {(!collapsed || mobileSidebarOpen) && <span>Encerrar Sessão</span>}
        </button>
      </div>
    </aside>
  );
}
