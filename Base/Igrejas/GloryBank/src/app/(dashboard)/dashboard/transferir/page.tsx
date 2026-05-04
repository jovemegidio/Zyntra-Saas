"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpDown, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { transferSchema, type TransferInput } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

const pixKeyTypes = [
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Telefone" },
  { value: "EVP", label: "Chave Aleatória" },
];

export default function TransferPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<TransferInput | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      pixKeyType: "CPF",
    },
  });

  const onSubmit = (data: TransferInput) => {
    setPendingData(data);
    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    if (!pendingData) return;
    setIsLoading(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/asaas/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingData),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "Erro ao realizar transferência");
        return;
      }

      toast.success("Transferência realizada com sucesso!");
      reset();
      setPendingData(null);
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
              Transferir
            </h1>
            <p className="text-sm text-slate-500">
              Envie dinheiro via PIX para qualquer conta
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-blue-400" />
                Nova Transferência
              </CardTitle>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Select
                label="Tipo da chave"
                options={pixKeyTypes}
                error={errors.pixKeyType?.message}
                {...register("pixKeyType")}
              />

              <Input
                label="Chave PIX do destinatário"
                placeholder="Digite a chave PIX"
                error={errors.pixKey?.message}
                {...register("pixKey")}
              />

              <Input
                label="Valor (R$)"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                error={errors.amount?.message}
                {...register("amount", { valueAsNumber: true })}
              />

              <Input
                label="Descrição (opcional)"
                placeholder="Ex: Pagamento"
                error={errors.description?.message}
                {...register("description")}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full"
                size="lg"
              >
                Transferir
              </Button>
            </form>
          </Card>
        </div>

        {/* Confirmation Modal */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirmar Transferência"
        >
          {pendingData && (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.03)" }}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Chave PIX</span>
                    <span className="text-sm font-medium">
                      {pendingData.pixKey}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Valor</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(pendingData.amount)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmTransfer}
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
