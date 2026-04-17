import { getCurrentUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { DEMO_USER_ID } from "@/lib/demo";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    if (user.id === DEMO_USER_ID) {
      // In demo mode, generate a mock TOTP secret
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      let secret = "";
      for (let i = 0; i < 32; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
      }
      const otpauthUri = `otpauth://totp/GloryBank:demo@glorybank.com?secret=${secret}&issuer=GloryBank&digits=6&period=30`;
      return successResponse({
        secret,
        otpauthUri,
        enabled: false,
        message: "Escaneie o QR Code com seu app autenticador (Google Authenticator, Authy, etc.)",
      });
    }

    // For real users, generate TOTP secret using Web Crypto
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += chars[array[i % 20] % 32];
    }

    const otpauthUri = `otpauth://totp/GloryBank:${user.email}?secret=${secret}&issuer=GloryBank&digits=6&period=30`;

    return successResponse({
      secret,
      otpauthUri,
      enabled: false,
      message: "Escaneie o QR Code com seu app autenticador",
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return errorResponse("Erro ao configurar 2FA", 500);
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    if (user.id === DEMO_USER_ID) {
      return successResponse({ enabled: false });
    }

    // Check if 2FA is enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbUser = user as any;
    return successResponse({
      enabled: dbUser.twoFactorEnabled || false,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return errorResponse("Erro ao verificar 2FA", 500);
  }
}
