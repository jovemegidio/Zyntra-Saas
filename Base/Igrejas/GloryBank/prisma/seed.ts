import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("Demo@123456", 12);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@glorybank.com" },
    update: {},
    create: {
      name: "João Demo Silva",
      email: "demo@glorybank.com",
      cpfCnpj: "12345678901",
      phone: "11999887766",
      passwordHash,
      address: "Av. Paulista",
      addressNumber: "1000",
      province: "Bela Vista",
      postalCode: "01310-100",
      city: "São Paulo",
      state: "SP",
      isActive: true,
      isVerified: true,
    },
  });

  // Seed sample transactions so the extrato page is not empty
  const now = new Date();
  const sampleTx = [
    {
      userId: demoUser.id,
      type: "PIX_RECEIVED" as const,
      status: "CONFIRMED" as const,
      amount: 1500.0,
      description: "PIX de João Silva",
      recipientName: "João Silva",
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000),
    },
    {
      userId: demoUser.id,
      type: "PIX_SENT" as const,
      status: "CONFIRMED" as const,
      amount: 250.0,
      description: "Pagamento aluguel",
      pixKey: "maria@email.com",
      pixKeyType: "EMAIL",
      recipientName: "Maria Santos",
      createdAt: new Date(now.getTime() - 26 * 3600 * 1000),
    },
    {
      userId: demoUser.id,
      type: "BOLETO_CREATED" as const,
      status: "PENDING" as const,
      amount: 189.9,
      description: "Energia Elétrica",
      boletoBarCode: "34191.09008 67629.640001 56900.630006 3 84690000018990",
      recipientName: "Energia Elétrica SP",
      createdAt: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
    },
    {
      userId: demoUser.id,
      type: "PIX_RECEIVED" as const,
      status: "CONFIRMED" as const,
      amount: 3200.0,
      description: "Salário mensal",
      recipientName: "Empresa Tech Ltda",
      createdAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000),
    },
    {
      userId: demoUser.id,
      type: "TRANSFER_SENT" as const,
      status: "CONFIRMED" as const,
      amount: 800.0,
      description: "Reserva de emergência",
      pixKey: "poupanca@banco.com",
      pixKeyType: "EMAIL",
      recipientName: "Conta Poupança",
      createdAt: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
    },
  ];

  // Delete existing demo transactions before re-seeding
  await prisma.transaction.deleteMany({ where: { userId: demoUser.id } });
  await prisma.transaction.createMany({ data: sampleTx });

  console.log("✅ Demo account ready:");
  console.log("   Email:  demo@glorybank.com");
  console.log("   Senha:  Demo@123456");
  console.log(`   ID:     ${demoUser.id}`);
  console.log(`   Transações: ${sampleTx.length} inseridas`);
  console.log("");
  console.log("💡 Tip: Keep DEMO_MODE=true in the online environment for presentation mode");
  console.log("   and no real Asaas API key will be required.");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

