import { destroySession } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST() {
  try {
    await destroySession();
    return successResponse({ message: "Logout realizado" });
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse("Erro ao fazer logout", 500);
  }
}
