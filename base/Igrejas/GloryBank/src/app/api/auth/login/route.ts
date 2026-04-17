import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations";
import { verifyPassword, createSession, createDemoSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/api-response";
import { checkRateLimit, getRateLimitConfig } from "@/lib/rate-limit";
import { DEMO_MODE, DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER } from "@/lib/demo";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const config = getRateLimitConfig("/api/auth/login");
    const rateLimit = checkRateLimit(`login:${ip}`, config);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Email ou senha inválidos");
    }

    const { email, password } = validation.data;

    // Demo mode: accept hardcoded credentials without any database access
    if (DEMO_MODE && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      await createDemoSession();
      return successResponse({
        user: { id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email },
      });
    }

    // Find user - use generic message to prevent email enumeration
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return errorResponse("Email ou senha incorretos", 401);
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse("Email ou senha incorretos", 401);
    }

    // Create session
    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession(user.id, userAgent, ip);

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Erro interno do servidor", 500);
  }
}
