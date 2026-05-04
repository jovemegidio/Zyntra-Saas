import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions } from "@/lib/asaas";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { DEMO_USER_ID, DEMO_TRANSACTIONS } from "@/lib/demo";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    // Demo mode: return mock transaction list
    if (user.id === DEMO_USER_ID) {
      const limit = Math.min(parseInt(new URL(request.url).searchParams.get("limit") || "20"), 100);
      const offset = parseInt(new URL(request.url).searchParams.get("offset") || "0");
      const slice = DEMO_TRANSACTIONS.data.slice(offset, offset + limit);
      return successResponse({
        data: slice,
        total: DEMO_TRANSACTIONS.totalCount,
        hasMore: offset + limit < DEMO_TRANSACTIONS.totalCount,
      });
    }

    const url = new URL(request.url);
    const source = url.searchParams.get("source") || "local";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const startDate = url.searchParams.get("startDate") || undefined;
    const finishDate = url.searchParams.get("finishDate") || undefined;

    if (source === "asaas" && user.asaasApiKey) {
      const transactions = await getTransactions(user.asaasApiKey, {
        limit,
        offset,
        startDate,
        finishDate,
      });
      return successResponse(transactions);
    }

    // Local transactions from database
    const where: Record<string, unknown> = { userId: user.id };

    if (startDate || finishDate) {
      where.createdAt = {};
      if (startDate)
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (finishDate)
        (where.createdAt as Record<string, unknown>).lte = new Date(finishDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return successResponse({
      data: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: Number(tx.amount),
        fee: tx.fee ? Number(tx.fee) : null,
        description: tx.description,
        pixKey: tx.pixKey,
        recipientName: tx.recipientName,
        date: tx.createdAt.toISOString(),
      })),
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Transactions error:", error);
    return errorResponse("Erro ao buscar transações", 500);
  }
}
