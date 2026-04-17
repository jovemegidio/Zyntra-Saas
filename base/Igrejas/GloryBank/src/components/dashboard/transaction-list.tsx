"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  ArrowUpDown,
  Receipt,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ReceiptModal } from "@/components/dashboard/receipt-modal";

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  date: string;
  recipientName: string | null;
}

interface TransactionListProps {
  transactions: Transaction[];
}

const typeConfig: Record<
  string,
  { icon: typeof ArrowUpRight; label: string; color: string; bg: string }
> = {
  PIX_SENT: { icon: ArrowUpRight, label: "PIX Enviado", color: "text-red-400", bg: "rgba(239,68,68,0.1)" },
  PIX_RECEIVED: { icon: ArrowDownLeft, label: "PIX Recebido", color: "text-green-400", bg: "rgba(34,197,94,0.1)" },
  BOLETO_CREATED: { icon: FileText, label: "Boleto Gerado", color: "text-blue-400", bg: "rgba(59,130,246,0.1)" },
  BOLETO_PAID: { icon: FileText, label: "Boleto Pago", color: "text-green-400", bg: "rgba(34,197,94,0.1)" },
  TRANSFER_SENT: { icon: ArrowUpDown, label: "Transferência Enviada", color: "text-red-400", bg: "rgba(239,68,68,0.1)" },
  TRANSFER_RECEIVED: { icon: ArrowUpDown, label: "Transferência Recebida", color: "text-green-400", bg: "rgba(34,197,94,0.1)" },
  DEPOSIT: { icon: ArrowDownLeft, label: "Depósito", color: "text-green-400", bg: "rgba(34,197,94,0.1)" },
  WITHDRAWAL: { icon: ArrowUpRight, label: "Saque", color: "text-red-400", bg: "rgba(239,68,68,0.1)" },
};

const statusConfig: Record<string, { variant: "success" | "warning" | "error" | "info"; label: string }> = {
  PENDING: { variant: "warning", label: "Pendente" },
  CONFIRMED: { variant: "success", label: "Confirmado" },
  CANCELLED: { variant: "error", label: "Cancelado" },
  FAILED: { variant: "error", label: "Falhou" },
  REFUNDED: { variant: "info", label: "Estornado" },
};

export function TransactionList({ transactions }: TransactionListProps) {
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div
          className="mb-3 rounded-full p-4"
          style={{ background: "rgba(0,0,0,0.03)" }}
        >
          <FileText className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-[13px] font-medium text-slate-500">Nenhuma transação encontrada</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Suas movimentações aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      {transactions.map((tx) => {
        const config = typeConfig[tx.type] ?? typeConfig.DEPOSIT;
        const status = statusConfig[tx.status] ?? statusConfig.PENDING;
        const Icon = config.icon;
        const isPositive =
          tx.type.includes("RECEIVED") ||
          tx.type === "DEPOSIT" ||
          tx.type === "BOLETO_PAID";

        return (
          <div
            key={tx.id}
            className="group flex items-center gap-3 px-4 py-3.5 sm:px-6 transition-colors hover:bg-black/[0.02]"
          >
            {/* Icon */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.color}`}
              style={{ background: config.bg }}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Description */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-slate-700 truncate">
                {config.label}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {tx.recipientName ?? tx.description ?? formatDate(tx.date)}
              </p>
            </div>

            {/* Date — hidden on very small screens */}
            <div className="hidden sm:block text-right shrink-0">
              <p className="text-[11px] text-slate-400">{formatDate(tx.date)}</p>
              <Badge variant={status.variant} size="sm">
                {status.label}
              </Badge>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0 ml-2">
              <p
                className={`text-[13px] font-semibold tabular-nums ${
                  isPositive ? "text-green-400" : "text-red-400"
                }`}
              >
                {isPositive ? "+" : "−"}{formatCurrency(Math.abs(tx.amount))}
              </p>
              {/* Status badge on mobile */}
              <div className="sm:hidden mt-0.5">
                <Badge variant={status.variant} size="sm">
                  {status.label}
                </Badge>
              </div>
            </div>

            {/* Receipt button */}
            <button
              onClick={() => setReceiptTx(tx)}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-black/[0.04] hover:text-slate-600 sm:ml-1"
              title="Ver comprovante"
            >
              <Receipt className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      <ReceiptModal
        transaction={receiptTx}
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
      />
    </div>
  );
}

