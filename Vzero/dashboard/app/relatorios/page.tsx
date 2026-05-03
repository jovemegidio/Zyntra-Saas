"use client"

import { FileText, FileDown, DollarSign, Receipt, Users, TrendingUp } from "lucide-react"
import {
  ModuleLayout,
  PageHeader,
  StatCard,
  ContentCard,
  FilterBar,
} from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

const chartData = [
  { name: "dez. de 2025", value: 0 },
  { name: "jan. de 2026", value: 0 },
  { name: "fev. de 2026", value: 0 },
  { name: "mar. de 2026", value: 50000 },
  { name: "abr. de 2026", value: 380000 },
  { name: "mai. de 2026", value: 0 },
]

export default function RelatoriosPage() {
  return (
    <ModuleLayout
      breadcrumbs={[
        { label: "Zyntra", href: "/" },
        { label: "Relatórios" },
      ]}
    >
      {/* Page Header */}
      <PageHeader
        icon={FileText}
        iconClassName="bg-blue-100 text-blue-600"
        title="Central de Relatórios"
        description="Análises e métricas de desempenho comercial"
        actions={
          <Button className="bg-blue-600 hover:bg-blue-700">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        }
      />

      {/* Filters */}
      <FilterBar className="mt-6" onFilter={() => {}}>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase text-slate-500">
            Data Inicial
          </Label>
          <Input type="date" defaultValue="2026-04-02" className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase text-slate-500">
            Data Final
          </Label>
          <Input type="date" defaultValue="2026-05-02" className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase text-slate-500">
            Vendedor
          </Label>
          <Select defaultValue="all">
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione um vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              <SelectItem value="joao">João Silva</SelectItem>
              <SelectItem value="maria">Maria Santos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total de Pedidos"
          value="0"
          subtitle="vs período anterior"
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Faturamento Total"
          value="R$ 0,00"
          subtitle="vs período anterior"
          color="green"
        />
        <StatCard
          icon={Receipt}
          label="Ticket Médio"
          value="R$ 0,00"
          subtitle="vs período anterior"
          color="purple"
        />
        <StatCard
          icon={Users}
          label="Vendedores Ativos"
          value="11"
          subtitle="no período"
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ContentCard
          icon={TrendingUp}
          title="Evolução das Vendas"
          actions={
            <Select defaultValue="value">
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">Por Valor</SelectItem>
                <SelectItem value="quantity">Por Quantidade</SelectItem>
              </SelectContent>
            </Select>
          }
          className="lg:col-span-2"
          contentClassName="h-72"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}.000` : value
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(value)
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ContentCard>

        <ContentCard
          icon={Receipt}
          iconClassName="text-blue-600"
          title="Pedidos por Status"
        >
          <div className="flex h-64 items-center justify-center text-slate-400">
            Nenhum dado disponível
          </div>
        </ContentCard>
      </div>
    </ModuleLayout>
  )
}
