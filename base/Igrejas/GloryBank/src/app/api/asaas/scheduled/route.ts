import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { DEMO_USER_ID, DEMO_SCHEDULED_TRANSFERS } from "@/lib/demo";

// In-memory demo store
let demoScheduled = [...DEMO_SCHEDULED_TRANSFERS];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    if (user.id === DEMO_USER_ID) {
      return successResponse({ data: demoScheduled });
    }

    const transfers = await prisma.scheduledTransfer.findMany({
      where: { userId: user.id },
      orderBy: { scheduledDate: "asc" },
    });

    return successResponse({
      data: transfers.map((t) => ({
        id: t.id,
        pixKey: t.pixKey,
        pixKeyType: t.pixKeyType,
        amount: Number(t.amount),
        description: t.description,
        scheduledDate: t.scheduledDate.toISOString(),
        recurrence: t.recurrence,
        status: t.status,
      })),
    });
  } catch (error) {
    console.error("Scheduled transfers error:", error);
    return errorResponse("Erro ao buscar agendamentos", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    const body = await request.json();
    const { pixKey, pixKeyType, amount, description, scheduledDate, recurrence } = body;

    if (!pixKey || !pixKeyType || !amount || !scheduledDate) {
      return errorResponse("Campos obrigatórios não preenchidos");
    }

    if (amount <= 0) return errorResponse("Valor deve ser positivo");

    const date = new Date(scheduledDate);
    if (date <= new Date()) return errorResponse("Data deve ser futura");

    if (user.id === DEMO_USER_ID) {
      const newTransfer = {
        id: "demo-sched-" + Date.now(),
        pixKey,
        pixKeyType,
        amount,
        description: description || null,
        scheduledDate: date.toISOString(),
        recurrence: recurrence || "ONCE",
        status: "SCHEDULED",
      };
      demoScheduled = [newTransfer, ...demoScheduled];
      return successResponse(newTransfer, 201);
    }

    const transfer = await prisma.scheduledTransfer.create({
      data: {
        userId: user.id,
        pixKey,
        pixKeyType,
        amount,
        description,
        scheduledDate: date,
        recurrence: recurrence || "ONCE",
      },
    });

    return successResponse(
      {
        id: transfer.id,
        pixKey: transfer.pixKey,
        pixKeyType: transfer.pixKeyType,
        amount: Number(transfer.amount),
        description: transfer.description,
        scheduledDate: transfer.scheduledDate.toISOString(),
        recurrence: transfer.recurrence,
        status: transfer.status,
      },
      201
    );
  } catch (error) {
    console.error("Create scheduled transfer error:", error);
    return errorResponse("Erro ao criar agendamento", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return errorResponse("ID é obrigatório");

    if (user.id === DEMO_USER_ID) {
      demoScheduled = demoScheduled.filter((t) => t.id !== id);
      return successResponse({ success: true });
    }

    await prisma.scheduledTransfer.delete({
      where: { id, userId: user.id },
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error("Delete scheduled transfer error:", error);
    return errorResponse("Erro ao cancelar agendamento", 500);
  }
}
