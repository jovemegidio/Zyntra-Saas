import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { DEMO_USER_ID, DEMO_CARD_REQUESTS } from "@/lib/demo";

// In-memory demo store
let demoCards: Array<{
  id: string;
  cardType: string;
  status: string;
  lastFour: string;
  brand: string;
  cardName: string;
  requestedAt: string;
  approvedAt: string | null;
}> = [...DEMO_CARD_REQUESTS];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    if (user.id === DEMO_USER_ID) {
      return successResponse({ data: demoCards });
    }

    const cards = await prisma.cardRequest.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: "desc" },
    });

    return successResponse({
      data: cards.map((c) => ({
        id: c.id,
        cardType: c.cardType,
        status: c.status,
        lastFour: c.lastFour,
        brand: c.brand,
        cardName: c.cardName,
        requestedAt: c.requestedAt.toISOString(),
        approvedAt: c.approvedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Card requests error:", error);
    return errorResponse("Erro ao buscar cartões", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Não autenticado", 401);

    const body = await request.json();
    const { cardType } = body;

    if (!cardType || !["VIRTUAL", "PHYSICAL"].includes(cardType)) {
      return errorResponse("Tipo de cartão inválido");
    }

    if (user.id === DEMO_USER_ID) {
      // Check if already has this type
      const existing = demoCards.find(
        (c) => c.cardType === cardType && ["PENDING", "APPROVED", "ACTIVE"].includes(c.status)
      );
      if (existing) {
        return errorResponse("Você já possui um cartão deste tipo");
      }

      const lastFour = String(Math.floor(1000 + Math.random() * 9000));
      const newCard = {
        id: "demo-card-" + Date.now(),
        cardType,
        status: cardType === "VIRTUAL" ? "ACTIVE" : "PENDING",
        lastFour,
        brand: "Visa",
        cardName: user.name.toUpperCase().replace(/[^A-Z ]/g, ""),
        requestedAt: new Date().toISOString(),
        approvedAt: cardType === "VIRTUAL" ? new Date().toISOString() : null,
      };
      demoCards = [newCard, ...demoCards];
      return successResponse(newCard, 201);
    }

    const existing = await prisma.cardRequest.findFirst({
      where: {
        userId: user.id,
        cardType,
        status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
      },
    });

    if (existing) {
      return errorResponse("Você já possui um cartão deste tipo");
    }

    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const card = await prisma.cardRequest.create({
      data: {
        userId: user.id,
        cardType,
        status: cardType === "VIRTUAL" ? "ACTIVE" : "PENDING",
        lastFour,
        cardName: user.name.toUpperCase(),
        approvedAt: cardType === "VIRTUAL" ? new Date() : null,
      },
    });

    return successResponse(
      {
        id: card.id,
        cardType: card.cardType,
        status: card.status,
        lastFour: card.lastFour,
        brand: card.brand,
        cardName: card.cardName,
        requestedAt: card.requestedAt.toISOString(),
        approvedAt: card.approvedAt?.toISOString() || null,
      },
      201
    );
  } catch (error) {
    console.error("Create card error:", error);
    return errorResponse("Erro ao solicitar cartão", 500);
  }
}
