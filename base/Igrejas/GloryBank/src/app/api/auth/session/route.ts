import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Não autenticado", 401);
    }

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpfCnpj,
        phone: user.phone,
        accountActive: !!user.asaasAccountId,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Session error:", error);
    return errorResponse("Erro interno do servidor", 500);
  }
}
