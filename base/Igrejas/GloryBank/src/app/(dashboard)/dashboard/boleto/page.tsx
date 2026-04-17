"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, ArrowLeft, ExternalLink, Copy } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { boletoSchema, type BoletoInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface BoletoResult {
  id: string;
  bankSlipUrl: string;
  invoiceUrl: string;
  barCode: string;
  value: number;
  status: string;
}

export default function BoletoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [boletoResult, setBoletoResult] = useState<BoletoResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BoletoInput>({
    resolver: zodResolver(boletoSchema),
  });

  const onSubmit = async (data: BoletoInput) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/asaas/boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "Erro ao gerar boleto");
        return;
      }

      setBoletoResult(result.data);
      toast.success("Boleto gerado com sucesso!");
      reset();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl p-2 text-slate-500 hover:bg-black/[0.04]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Boleto
            </h1>
            <p className="text-sm text-slate-500">
              Gere boletos para receber pagamentos
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-lg">
          {!boletoResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-400" />
                  Gerar Boleto
                </CardTitle>
              </CardHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Nome do pagador"
                  placeholder="Nome completo"
                  error={errors.customerName?.message}
                  {...register("customerName")}
                />

                <Input
                  label="CPF/CNPJ do pagador"
                  placeholder="000.000.000-00"
                  error={errors.customerCpfCnpj?.message}
                  {...register("customerCpfCnpj")}
                />

                <Input
                  label="Valor (R$)"
                  type="number"
                  step="0.01"
                  min="5"
                  placeholder="0,00"
                  error={errors.amount?.message}
                  {...register("amount", { valueAsNumber: true })}
                />

                <Input
                  label="Data de vencimento"
                  type="date"
                  error={errors.dueDate?.message}
                  {...register("dueDate")}
                />

                <Input
                  label="Descrição (opcional)"
                  placeholder="Ex: Serviço prestado"
                  error={errors.description?.message}
                  {...register("description")}
                />

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Gerar Boleto
                </Button>
              </form>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <FileText className="h-5 w-5" />
                  Boleto Gerado!
                </CardTitle>
              </CardHeader>

              <div className="space-y-4">
                <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.08)" }}>
                  <p className="text-center text-2xl font-bold text-red-500">
                    {formatCurrency(boletoResult.value)}
                  </p>
                </div>

                {boletoResult.barCode && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                    <p className="text-xs text-slate-500 mb-1">Código de barras</p>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 break-all text-xs font-mono">
                        {boletoResult.barCode}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(boletoResult.barCode);
                          toast.success("Código copiado!");
                        }}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-black/[0.04]"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {boletoResult.bankSlipUrl && (
                    <a
                      href={boletoResult.bankSlipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver Boleto
                    </a>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setBoletoResult(null)}
                    className="flex-1"
                  >
                    Novo Boleto
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
