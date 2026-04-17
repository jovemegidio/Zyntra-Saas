import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPixTransfer, createPixQrCode, getPixKeys, createPixKey } from "@/lib/asaas";
import { prisma } from "@/lib/prisma";
import { pixTransferSchema } from "@/lib/validations";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";
import { checkRateLimit, getRateLimitConfig } from "@/lib/rate-limit";
import { DEMO_USER_ID, DEMO_PIX_KEYS, demoPIXQrCode, demoPIXTransfer } from "@/lib/demo";

// Send PIX
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);
    if (!user.asaasApiKey && user.id !== DEMO_USER_ID) return errorResponse("Conta bancária não configurada", 400);

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const config = getRateLimitConfig("/api/asaas/pix");
    const rateLimit = checkRateLimit(`pix:${user.id}:${ip}`, config);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const body = await request.json();
    const validation = pixTransferSchema.safeParse(body);

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

    // Demo mode: return mock PIX result
    if (user.id === DEMO_USER_ID) {
      return successResponse(demoPIXTransfer(pixKey, amount, description));
    }

    const pixResult = await createPixTransfer(
      {
        value: amount,
        pixAddressKey: pixKey,
        pixAddressKeyType: pixKeyType,
        description,
      },
      user.asaasApiKey
    );

    // Record transaction
    await prisma.transaction.create({
      data: {
        userId: user.id,
        asaasId: pixResult.id,
        type: "PIX_SENT",
        status: pixResult.status === "DONE" ? "CONFIRMED" : "PENDING",
        amount,
        description,
        pixKey,
        pixKeyType,
      },
    });

    return successResponse(pixResult);
  } catch (error) {
    console.error("PIX transfer error:", error);
    return errorResponse("Erro ao realizar transferência PIX", 500);
  }
}

// Get PIX keys
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);
    if (!user.asaasApiKey && user.id !== DEMO_USER_ID) return errorResponse("Conta bancária não configurada", 400);

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    // Demo mode: return mock data for all PIX actions
    if (user.id === DEMO_USER_ID) {
      if (action === "qrcode") {
        const value = url.searchParams.get("value");
        return successResponse(demoPIXQrCode(value ? parseFloat(value) : undefined));
      }
      if (action === "create-key") {
        return successResponse({
          id: "demo-key-" + Date.now(),
          key: "random-evp-key-" + Date.now(),
          keyType: "EVP",
          status: "ACTIVE",
        });
      }
      return successResponse(DEMO_PIX_KEYS);
    }

    if (action === "qrcode") {
      const value = url.searchParams.get("value");
      const description = url.searchParams.get("description");

      const keysResponse = await getPixKeys(user.asaasApiKey);
      const activeKey = keysResponse.data?.find((k) => k.status === "ACTIVE");

      if (!activeKey) {
        return errorResponse("Nenhuma chave PIX ativa encontrada", 404);
      }

      const qrCode = await createPixQrCode(
        {
          addressKey: activeKey.key,
          value: value ? parseFloat(value) : undefined,
          description: description || undefined,
        },
        user.asaasApiKey
      );

      return successResponse(qrCode);
    }

    if (action === "create-key") {
      const type = (url.searchParams.get("type") || "EVP") as "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
      const key = await createPixKey(type, user.asaasApiKey);
      return successResponse(key);
    }

    const keys = await getPixKeys(user.asaasApiKey);
    return successResponse(keys);
  } catch (error) {
    console.error("PIX keys error:", error);
    return errorResponse("Erro ao buscar chaves PIX", 500);
  }
}
