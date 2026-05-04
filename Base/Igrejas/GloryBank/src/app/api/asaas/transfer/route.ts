import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createTransfer } from "@/lib/asaas";
import { prisma } from "@/lib/prisma";
import { transferSchema } from "@/lib/validations";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";
import { checkRateLimit, getRateLimitConfig } from "@/lib/rate-limit";
import { DEMO_USER_ID, demoTransfer } from "@/lib/demo";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);
    if (!user.asaasApiKey && user.id !== DEMO_USER_ID) return errorResponse("Conta bancária não configurada", 400);

    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const config = getRateLimitConfig("/api/asaas/transfer");
    const rateLimit = checkRateLimit(`transfer:${user.id}:${ip}`, config);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const body = await request.json();
    const validation = transferSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) errors[path] = [];
        errors[path].push(err.message);
      });
      return errorResponse("Dados inválidos", 400, errors);
    }

    const { pixKey, pixKeyType, amount, description } = validation.data;

    // Demo mode: return mock transfer result
    if (user.id === DEMO_USER_ID) {
      return successResponse(demoTransfer(amount, pixKey, description));
    }

    const transfer = await createTransfer(
      {
        value: amount,
        operationType: "PIX",
        pixAddressKey: pixKey,
        pixAddressKeyType: pixKeyType,
        description,
      },
      user.asaasApiKey!
    );

    // Record transaction
    await prisma.transaction.create({
      data: {
        userId: user.id,
        asaasId: transfer.id,
        type: "TRANSFER_SENT",
        status: transfer.status === "DONE" ? "CONFIRMED" : "PENDING",
        amount,
        fee: transfer.transferFee,
        description,
        pixKey,
        pixKeyType,
      },
    });

    return successResponse(transfer);
  } catch (error) {
    console.error("Transfer error:", error);
    return errorResponse("Erro ao realizar transferência", 500);
  }
}
