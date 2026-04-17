import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPayment, createCustomer, getCustomers } from "@/lib/asaas";
import { prisma } from "@/lib/prisma";
import { boletoSchema } from "@/lib/validations";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import { DEMO_USER_ID, demoBoleto } from "@/lib/demo";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);
    if (!user.asaasApiKey && user.id !== DEMO_USER_ID) return errorResponse("Conta bancária não configurada", 400);

    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const rateLimit = checkRateLimit(`boleto:${user.id}:${ip}`);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const body = await request.json();
    const validation = boletoSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string[]> = {};
      validation.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!errors[path]) errors[path] = [];
        errors[path].push(err.message);
      });
      return errorResponse("Dados inválidos", 400, errors);
    }

    const { customerName, customerCpfCnpj, amount, dueDate, description } =
      validation.data;

    // Demo mode: return mock boleto
    if (user.id === DEMO_USER_ID) {
      const mock = demoBoleto(amount, customerName, dueDate, description);
      return successResponse({
        id: mock.id,
        status: mock.status,
        value: mock.value,
        dueDate: mock.dueDate,
        barCode: mock.barCode,
        bankSlipUrl: null,
        invoiceUrl: null,
        customer: customerName,
        description: mock.description,
      });
    }

    // Find or create customer
    let customerId: string;
    const existingCustomers = await getCustomers(
      user.asaasApiKey,
      customerCpfCnpj
    );

    if (existingCustomers.data?.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await createCustomer(
        { name: customerName, cpfCnpj: customerCpfCnpj },
        user.asaasApiKey
      );
      customerId = newCustomer.id;
    }

    // Create boleto payment
    const payment = await createPayment(
      {
        customer: customerId,
        billingType: "BOLETO",
        value: amount,
        dueDate,
        description,
      },
      user.asaasApiKey
    );

    // Record transaction
    await prisma.transaction.create({
      data: {
        userId: user.id,
        asaasId: payment.id,
        type: "BOLETO_CREATED",
        status: "PENDING",
        amount,
        description,
        boletoUrl: payment.bankSlipUrl,
        boletoBarCode: payment.barCode,
        recipientName: customerName,
        recipientCpfCnpj: customerCpfCnpj,
      },
    });

    return successResponse({
      id: payment.id,
      bankSlipUrl: payment.bankSlipUrl,
      invoiceUrl: payment.invoiceUrl,
      barCode: payment.barCode,
      value: payment.value,
      status: payment.status,
    });
  } catch (error) {
    console.error("Boleto error:", error);
    return errorResponse("Erro ao gerar boleto", 500);
  }
}
