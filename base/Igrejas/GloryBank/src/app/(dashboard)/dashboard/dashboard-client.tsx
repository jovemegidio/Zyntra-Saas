"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TransactionList } from "@/components/dashboard/transaction-list";
import { SkeletonBalanceCard, SkeletonTransactions } from "@/components/ui/loading";
import { Toaster } from "react-hot-toast";

interface DashboardClientProps {
  userId: string;
  userName: string;
  userEmail: string;
}

interface BalanceData {
  balance: number;
  statistics: {
    pending: number;
    confirmed: number;
  };
}

interface TransactionData {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  date: string;
  recipientName: string | null;
}

export function DashboardClient({ userName }: DashboardClientProps) {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[] | null>(null);

  const fetchDashboardData = useCallback(async () => {
    const [balanceRes, txRes] = await Promise.all([
      fetch("/api/asaas/balance").catch(() => null),
      fetch("/api/asaas/transactions?limit=10").catch(() => null),
    ]);

    if (balanceRes?.ok) {
      const data = await balanceRes.json();
      if (data.success) setBalance(data.data);
    }
    if (txRes?.ok) {
      const data = await txRes.json();
      if (data.success) setTransactions(data.data.data || []);
    } else {
      setTransactions([]);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-6 fade-in-up">
        {/* Welcome */}
        <div className="fade-in-up">
          <h1 className="text-2xl font-bold text-slate-800">
            Bem-vindo, {userName.split(" ")[0]}!
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhe suas finanças e realize transações
          </p>
        </div>

        {/* Balance Card — skeleton until data arrives */}
        <div className="fade-in-up-delay-1">
          {balance === null ? (
            <SkeletonBalanceCard />
          ) : (
            <BalanceCard
              balance={balance.balance}
              pending={balance.statistics?.pending ?? 0}
              available={balance.statistics?.confirmed ?? balance.balance}
            />
          )}
        </div>

        {/* Quick Actions — static, renders immediately */}
        <div className="fade-in-up-delay-2">
          <h2 className="mb-3 text-[15px] font-semibold text-slate-700">
            Ações Rápidas
          </h2>
          <QuickActions />
        </div>

        {/* Recent Transactions — skeleton until data arrives */}
        <div className="fade-in-up-delay-3">
          <Card noPadding>
            <CardHeader className="px-4 pt-5 pb-0 sm:px-6">
              <CardTitle>Transações Recentes</CardTitle>
            </CardHeader>
            {transactions === null ? (
              <div className="px-6 pb-4">
                <SkeletonTransactions />
              </div>
            ) : (
              <TransactionList transactions={transactions} />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
