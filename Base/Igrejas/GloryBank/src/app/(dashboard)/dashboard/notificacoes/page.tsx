"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, ArrowLeft, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/ui/loading";
import { Toaster } from "react-hot-toast";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const result = await res.json();
      if (result.success) {
        setNotifications(result.data.data || []);
        setUnreadCount(result.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora mesmo";
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  if (loading) return <PageLoading />;

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl p-2 text-slate-500 hover:bg-black/[0.04]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Notificações</h1>
              <p className="text-sm text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`
                  : "Todas lidas"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <Card noPadding>
          <CardHeader className="px-4 pt-5 pb-0 sm:px-6">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-500" />
              Todas as notificações
            </CardTitle>
          </CardHeader>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div
                className="mb-3 rounded-full p-4"
                style={{ background: "rgba(0,0,0,0.03)" }}
              >
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-[13px] font-medium text-slate-500">
                Nenhuma notificação
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Suas notificações aparecerão aqui
              </p>
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "rgba(0,0,0,0.06)" }}
            >
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-4 sm:px-6 transition-colors ${
                    !notif.isRead ? "bg-red-50/50" : "hover:bg-black/[0.02]"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      !notif.isRead
                        ? "bg-red-100 text-red-500"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-[13px] font-medium ${
                          !notif.isRead ? "text-slate-800" : "text-slate-600"
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {notif.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {!notif.isRead ? (
                        <Badge variant="error" size="sm">
                          Nova
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm">
                          Lida
                        </Badge>
                      )}
                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-medium"
                        >
                          <Check className="h-3 w-3" />
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
