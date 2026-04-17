"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QrCode, Send, Key, ArrowLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { pixTransferSchema, type PixTransferInput } from "@/lib/validations";
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

export default function PixPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<PixTransferInput | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{
    encodedImage: string;
    payload: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PixTransferInput>({
    resolver: zodResolver(pixTransferSchema),
    defaultValues: {
      pixKeyType: "CPF",
    },
  });

  const watchAmount = watch("amount");

  const onSubmit = (data: PixTransferInput) => {
    setPendingData(data);
    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    if (!pendingData) return;
    setIsLoading(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/asaas/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingData),
      });

      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "Erro ao enviar PIX");
        return;
      }

      toast.success("PIX enviado com sucesso!");
      reset();
      setPendingData(null);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateQrCode = async () => {
    setIsLoading(true);
    try {
      const value = watchAmount || 0;
      const res = await fetch(
        `/api/asaas/pix?action=qrcode&value=${value}`
      );
      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "Erro ao gerar QR Code");
        return;
      }

      setQrCodeData(result.data);
      setShowQrCode(true);
    } catch {
      toast.error("Erro ao gerar QR Code");
    } finally {
      setIsLoading(false);
    }
  };

  const createRandomKey = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/asaas/pix?action=create-key&type=EVP");
      const result = await res.json();

      if (!result.success) {
        toast.error(result.error || "Erro ao criar chave PIX");
        return;
      }

      toast.success(`Chave PIX criada: ${result.data.key}`);
    } catch {
      toast.error("Erro ao criar chave PIX");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl p-2 text-slate-500 hover:bg-black/[0.04]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              PIX
            </h1>
            <p className="text-sm text-slate-500">
              Envie e receba PIX instantaneamente
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Send PIX */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                Enviar PIX
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
                label="Chave PIX"
                placeholder="Digite a chave PIX do destinatário"
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
                placeholder="Ex: Pagamento de aluguel"
                error={errors.description?.message}
                {...register("description")}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full"
                size="lg"
              >
                Enviar PIX
              </Button>
            </form>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Card
              hover
              onClick={generateQrCode}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <QrCode className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Gerar QR Code
                  </h3>
                  <p className="text-sm text-slate-500">
                    Crie um QR Code para receber PIX
                  </p>
                </div>
              </div>
            </Card>

            <Card
              hover
              onClick={createRandomKey}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <Key className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Criar Chave Aleatória
                  </h3>
                  <p className="text-sm text-slate-500">
                    Gere uma chave PIX aleatória (EVP)
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Confirmation Modal */}
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirmar PIX"
        >
          {pendingData && (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.03)" }}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Chave PIX</span>
                    <span className="text-sm font-medium">{pendingData.pixKey}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Tipo</span>
                    <span className="text-sm font-medium">{pendingData.pixKeyType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Valor</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(pendingData.amount)}
                    </span>
                  </div>
                  {pendingData.description && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Descrição</span>
                      <span className="text-sm font-medium">
                        {pendingData.description}
                      </span>
                    </div>
                  )}
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

        {/* QR Code Modal */}
        <Modal
          isOpen={showQrCode}
          onClose={() => setShowQrCode(false)}
          title="QR Code PIX"
        >
          {qrCodeData && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${qrCodeData.encodedImage}`}
                  alt="QR Code PIX"
                  className="h-64 w-64 rounded-xl"
                />
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                <p className="text-xs text-slate-500 mb-1">Copia e Cola</p>
                <p className="break-all text-xs font-mono">
                  {qrCodeData.payload}
                </p>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeData.payload);
                  toast.success("Código copiado!");
                }}
                variant="outline"
                className="w-full"
              >
                Copiar código
              </Button>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
