import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { DEMO_USER_ID, DEMO_NOTIFICATIONS } from "@/lib/demo";

// In-memory store for demo notification read state
const demoReadState = new Set<string>();

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    if (user.id === DEMO_USER_ID) {
      const notifications = DEMO_NOTIFICATIONS.map((n) => ({
        ...n,
        isRead: n.isRead || demoReadState.has(n.id),
      }));
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      return successResponse({ data: notifications, unreadCount });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return successResponse({
      data: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return errorResponse("Erro ao buscar notificações", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (user.id === DEMO_USER_ID) {
      if (markAllRead) {
        DEMO_NOTIFICATIONS.forEach((n) => demoReadState.add(n.id));
      } else if (notificationId) {
        demoReadState.add(notificationId);
      }
      return successResponse({ success: true });
    }

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
    } else if (notificationId) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error("Notification update error:", error);
    return errorResponse("Erro ao atualizar notificação", 500);
  }
}
