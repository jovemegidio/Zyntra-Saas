"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";

interface CardData {
  id: string;
  cardType: string;
  status: string;
  lastFour: string | null;
  brand: string;
  cardName: string | null;
}

type Step = "fill" | "confirm" | "done";
type PaymentOption = "updated" | "total" | "minimum";
type PaymentDate = "today" | "schedule";

export default function FaturaPage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("fill");

  // Form state
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("updated");
  const [paymentDate, setPaymentDate] = useState<PaymentDate>("today");
  const [scheduleDate, setScheduleDate] = useState("");

  // Demo invoice values
  const invoiceData = {
    updated: 0.0,
    total: 1847.53,
    minimum: 184.75,
    dueDate: "10/04/2026",
  };

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch("/api/card");
      const result = await res.json();
      if (result.success) {
        const active = (result.data || []).filter(
          (c: CardData) => c.status === "ACTIVE"
        );
        setCards(active);
        if (active.length > 0) setSelectedCard(active[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const getPaymentAmount = () => {
    switch (paymentOption) {
      case "updated":
        return invoiceData.updated;
      case "total":
        return invoiceData.total;
      case "minimum":
        return invoiceData.minimum;
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleConfirm = () => {
    if (!selectedCard) {
      toast.error("Selecione um cartão");
      return;
    }
    setStep("confirm");
  };

  const handlePay = () => {
    const amount = getPaymentAmount();
    if (amount === 0) {
      toast.success("Nenhum valor pendente. Fatura em dia!");
    } else {
      toast.success(
        `Pagamento de ${formatCurrency(amount)} realizado com sucesso!`
      );
    }
    setStep("done");
  };

  if (loading) return <PageLoading />;

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/cartao"
            className="rounded-xl p-2 text-slate-500 hover:bg-black/[0.04]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Pagar ou Parcelar Fatura
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie o pagamento da fatura do seu cartão
            </p>
          </div>
        </div>

        {/* Balance bar */}
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-3"
          style={{
            background: "linear-gradient(90deg, #f8f8fa 0%, #f1f5f9 100%)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <DollarSign className="h-4 w-4 text-slate-400" />
          <span className="text-[13px] text-slate-500">
            Saldo de Conta Corrente (R$):
          </span>
          <span className="text-[14px] font-bold text-slate-800">
            R$ 12.450,00
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-end gap-6">
          <StepIndicator
            label="Preenchimento"
            active={step === "fill"}
            done={step === "confirm" || step === "done"}
          />
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <StepIndicator
            label="Confirmação"
            active={step === "confirm"}
            done={step === "done"}
          />
        </div>

        {/* Step: Fill */}
        {step === "fill" && (
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Column 1: Escolher cartão */}
            <Card className="lg:col-span-1">
              <h3 className="mb-4 text-[15px] font-bold text-slate-800">
                Escolher cartão
              </h3>

              {cards.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CreditCard className="mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-[13px] text-slate-500">
                    Nenhum cartão ativo
                  </p>
                  <Link
                    href="/dashboard/cartao"
                    className="mt-2 text-[13px] font-medium text-red-600 hover:underline"
                  >
                    Solicitar cartão
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {cards.map((card) => (
                    <label
                      key={card.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all ${
                        selectedCard?.id === card.id
                          ? "bg-red-50 ring-2 ring-red-500/30"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="card"
                        checked={selectedCard?.id === card.id}
                        onChange={() => setSelectedCard(card)}
                        className="mt-1 accent-red-600"
                      />
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">
                          {card.cardType === "VIRTUAL"
                            ? "CARTÃO VIRTUAL"
                            : "CARTÃO FÍSICO"}{" "}
                          GLORYBANK
                        </p>
                        <p className="text-[12px] text-slate-500">
                          FINAL: {card.lastFour || "****"} · {card.brand}
                        </p>
                        <div className="mt-3 space-y-1 text-[12px] text-slate-600">
                          <div>
                            <span className="text-slate-400">Valor Total</span>
                            <p className="font-bold text-slate-800">
                              {formatCurrency(invoiceData.total)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Vencimento</span>
                            <p className="font-semibold text-slate-700">
                              {invoiceData.dueDate}
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </Card>

            {/* Column 2: Opção de pagamento */}
            <Card className="lg:col-span-1">
              <h3 className="mb-4 text-[15px] font-bold text-slate-800">
                Opção de pagamento
              </h3>
              <div className="space-y-4">
                {/* Atualizado */}
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="option"
                    checked={paymentOption === "updated"}
                    onChange={() => setPaymentOption("updated")}
                    className="mt-1 accent-red-600"
                  />
                  <div>
                    <p className="text-[14px] font-bold text-slate-800">
                      Atualizado
                    </p>
                    <p className="text-[16px] font-bold text-red-600">
                      {formatCurrency(invoiceData.updated)}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                      Esse valor considera eventuais créditos ou débitos
                      ocorridos após o fechamento da fatura.
                    </p>
                  </div>
                </label>

                <div className="border-t border-slate-100" />

                {/* Total */}
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="option"
                    checked={paymentOption === "total"}
                    onChange={() => setPaymentOption("total")}
                    className="mt-1 accent-red-600"
                  />
                  <div>
                    <p className="text-[14px] font-bold text-slate-800">
                      Total
                    </p>
                    <p className="text-[16px] font-bold text-slate-700">
                      {formatCurrency(invoiceData.total)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Pagamento do valor total da fatura do cartão
                    </p>
                  </div>
                </label>

                <div className="border-t border-slate-100" />

                {/* Mínimo */}
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="option"
                    checked={paymentOption === "minimum"}
                    onChange={() => setPaymentOption("minimum")}
                    className="mt-1 accent-red-600"
                  />
                  <div>
                    <p className="text-[14px] font-bold text-slate-800">
                      Mínimo
                    </p>
                    <p className="text-[16px] font-bold text-slate-700">
                      {formatCurrency(invoiceData.minimum)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Pagamento do valor mínimo da fatura do cartão
                    </p>
                  </div>
                </label>
              </div>
            </Card>

            {/* Column 3: Data de pagamento */}
            <Card className="lg:col-span-1">
              <h3 className="mb-4 text-[15px] font-bold text-slate-800">
                Data de pagamento
              </h3>
              <div className="space-y-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="date"
                    checked={paymentDate === "today"}
                    onChange={() => setPaymentDate("today")}
                    className="accent-red-600"
                  />
                  <span className="text-[14px] font-medium text-slate-700">
                    Pagar hoje
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="date"
                    checked={paymentDate === "schedule"}
                    onChange={() => setPaymentDate("schedule")}
                    className="accent-red-600"
                  />
                  <span className="text-[14px] font-medium text-slate-700">
                    Agendar para
                  </span>
                </label>

                {paymentDate === "schedule" && (
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                )}
              </div>

              <div className="mt-8">
                <Button onClick={handleConfirm} className="w-full" size="lg">
                  Continuar
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <Card>
            <div className="mx-auto max-w-lg space-y-6">
              <div className="text-center">
                <FileText className="mx-auto mb-2 h-10 w-10 text-red-500" />
                <h2 className="text-lg font-bold text-slate-800">
                  Confirme o pagamento
                </h2>
                <p className="text-[13px] text-slate-500">
                  Revise os dados antes de confirmar
                </p>
              </div>

              <div
                className="space-y-3 rounded-xl p-5"
                style={{ background: "rgba(0,0,0,0.02)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">Cartão</span>
                  <span className="text-[13px] font-semibold text-slate-800">
                    {selectedCard?.cardType === "VIRTUAL"
                      ? "Virtual"
                      : "Físico"}{" "}
                    •••• {selectedCard?.lastFour}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">Opção</span>
                  <span className="text-[13px] font-semibold text-slate-800">
                    {paymentOption === "updated"
                      ? "Atualizado"
                      : paymentOption === "total"
                      ? "Total"
                      : "Mínimo"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">Valor</span>
                  <span className="text-[16px] font-bold text-red-600">
                    {formatCurrency(getPaymentAmount())}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">Data</span>
                  <span className="text-[13px] font-semibold text-slate-800">
                    {paymentDate === "today"
                      ? "Hoje"
                      : scheduleDate || "A definir"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("fill")}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button onClick={handlePay} className="flex-1" size="lg">
                  Confirmar pagamento
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <Card>
            <div className="mx-auto max-w-md py-8 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "rgba(34,197,94,0.1)" }}
              >
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Pagamento realizado!
              </h2>
              <p className="mt-1 text-[13px] text-slate-500">
                {getPaymentAmount() === 0
                  ? "Sua fatura está em dia. Nenhum valor pendente."
                  : `O valor de ${formatCurrency(getPaymentAmount())} foi debitado da sua conta.`}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/dashboard/cartao">
                  <Button variant="outline">Ver cartões</Button>
                </Link>
                <Link href="/dashboard/extrato">
                  <Button>Ver extrato</Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function StepIndicator({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <div
          className={`h-5 w-5 rounded-full border-2 ${
            active ? "border-red-500 bg-red-500" : "border-slate-300"
          }`}
        />
      )}
      <span
        className={`text-[13px] font-medium ${
          active || done ? "text-slate-800" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
