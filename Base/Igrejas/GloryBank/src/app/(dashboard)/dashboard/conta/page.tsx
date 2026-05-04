"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  Shield,
  Key,
} from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/loading";
import { formatCPF, formatPhone } from "@/lib/utils";

interface UserData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  accountActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface PixKey {
  id: string;
  key: string;
  type: string;
  status: string;
}

export default function ContaPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, keysRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/asaas/pix"),
      ]);

      const userData = await userRes.json();
      const keysData = await keysRes.json();

      if (userData.success) setUser(userData.data.user);
      if (keysData.success) setPixKeys(keysData.data.data || []);
    } catch (error) {
      console.error("Error fetching account data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <PageLoading />;
  if (!user) return null;

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
              Minha Conta
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie suas informaÃ§Ãµes e seguranÃ§a
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-400" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                <User className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Nome</p>
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                <Mail className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                <CreditCard className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">CPF/CNPJ</p>
                  <p className="text-sm font-medium">
                    {user.cpfCnpj.length === 11
                      ? formatCPF(user.cpfCnpj)
                      : user.cpfCnpj}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                <Phone className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="text-sm font-medium">
                    {formatPhone(user.phone)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Security & Account */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  SeguranÃ§a
                </CardTitle>
              </CardHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                  <div>
                    <p className="text-sm font-medium">Status da Conta</p>
                    <p className="text-xs text-slate-500">
                      Conta bancÃ¡ria digital
                    </p>
                  </div>
                  <Badge variant="success">
                    Ativa
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl p-3" style={{ background: "rgba(0,0,0,0.03)" }}>
                  <div>
                    <p className="text-sm font-medium">VerificaÃ§Ã£o</p>
                    <p className="text-xs text-slate-500">
                      VerificaÃ§Ã£o de identidade
                    </p>
                  </div>
                  <Badge
                    variant={user.isVerified ? "success" : "warning"}
                  >
                    {user.isVerified ? "Verificado" : "Pendente"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* PIX Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-400" />
                  Chaves PIX
                </CardTitle>
              </CardHeader>

              {pixKeys.length > 0 ? (
                <div className="space-y-2">
                  {pixKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-xl p-3"
                      style={{ background: "rgba(0,0,0,0.03)" }}
                    >
                      <div>
                        <p className="text-xs text-slate-500">{key.type}</p>
                        <p className="text-sm font-mono font-medium">
                          {key.key}
                        </p>
                      </div>
                      <Badge
                        variant={
                          key.status === "ACTIVE" ? "success" : "warning"
                        }
                      >
                        {key.status === "ACTIVE" ? "Ativa" : key.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-3">
                    Nenhuma chave PIX cadastrada
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          "/api/asaas/pix?action=create-key&type=EVP"
                        );
                        const result = await res.json();
                        if (result.success) {
                          toast.success("Chave PIX criada!");
                          fetchData();
                        } else {
                          toast.error(result.error);
                        }
                      } catch {
                        toast.error("Erro ao criar chave");
                      }
                    }}
                  >
                    Criar chave aleatÃ³ria
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
