/**
 * DEMO MODE
 * Set DEMO_MODE=true in the online deployment environment to enable
 * a fully-functional sandbox without PostgreSQL or Asaas credentials.
 *
 * Demo credentials:
 *   Email:  demo@glorybank.com
 *   Senha:  Demo@123456
 */

export const DEMO_MODE = process.env.DEMO_MODE === "true";

export const DEMO_USER_ID = "demo-user-glorybank-2025";
export const DEMO_EMAIL = "demo@glorybank.com";
export const DEMO_PASSWORD = "Demo@123456";

/** Fake user object — matches the Prisma User model shape */
export const DEMO_USER = {
  id: DEMO_USER_ID,
  name: "João Demo Silva",
  email: DEMO_EMAIL,
  cpfCnpj: "123.456.789-09",
  phone: "11999887766",
  passwordHash: "",
  asaasCustomerId: null,
  asaasAccountId: "demo-asaas-account",
  asaasWalletId: "demo-wallet-id",
  asaasApiKey: null, // keeps Asaas calls disabled → mocks kick in
  birthDate: null,
  address: "Av. Paulista",
  addressNumber: "1000",
  province: "Bela Vista",
  postalCode: "01310-100",
  city: "São Paulo",
  state: "SP",
  isActive: true,
  isVerified: true,
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-01-15"),
};

/** Mock balance returned on the /api/asaas/balance endpoint */
export const DEMO_BALANCE = {
  balance: 12450.0,
  statistics: {
    pending: 500.0,
    overdue: 0,
    confirmed: 11950.0,
  },
};

const now = Date.now();

/** Mock transaction list returned on the /api/asaas/transactions endpoint */
export const DEMO_TRANSACTIONS = {
  data: [
    {
      id: "demo-tx-1",
      type: "PIX_RECEIVED",
      status: "CONFIRMED",
      amount: 8500.0,
      fee: null,
      description: "Salário — Outubro/2025",
      pixKey: null,
      pixKeyType: null,
      boletoUrl: null,
      boletoBarCode: null,
      recipientName: "Glory Tech Soluções Ltda",
      recipientCpfCnpj: null,
      date: new Date(now - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: "demo-tx-2",
      type: "PIX_SENT",
      status: "CONFIRMED",
      amount: 1200.0,
      fee: null,
      description: "Aluguel outubro",
      pixKey: "ana.souza@gmail.com",
      pixKeyType: "EMAIL",
      boletoUrl: null,
      boletoBarCode: null,
      recipientName: "Ana Souza",
      recipientCpfCnpj: null,
      date: new Date(now - 1 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "demo-tx-3",
      type: "BOLETO_CREATED",
      status: "PENDING",
      amount: 189.9,
      fee: null,
      description: "Fatura Energia Elétrica",
      pixKey: null,
      pixKeyType: null,
      boletoUrl: null,
      boletoBarCode: "34191.09008 67629.640001 56900.630006 3 84690000018990",
      recipientName: "Enel Distribuição SP",
      recipientCpfCnpj: null,
      date: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "demo-tx-4",
      type: "PIX_SENT",
      status: "CONFIRMED",
      amount: 350.0,
      fee: null,
      description: "Supermercado",
      pixKey: "65.301.215/0001-90",
      pixKeyType: "CNPJ",
      boletoUrl: null,
      boletoBarCode: null,
      recipientName: "Carrefour Comércio e Indústria",
      recipientCpfCnpj: null,
      date: new Date(now - 4 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "demo-tx-5",
      type: "PIX_RECEIVED",
      status: "CONFIRMED",
      amount: 475.0,
      fee: null,
      description: "Freelance — landing page",
      pixKey: null,
      pixKeyType: null,
      boletoUrl: null,
      boletoBarCode: null,
      recipientName: "Lucas Ferreira",
      recipientCpfCnpj: null,
      date: new Date(now - 6 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "demo-tx-6",
      type: "TRANSFER_SENT",
      status: "CONFIRMED",
      amount: 1000.0,
      fee: 0,
      description: "Reserva de emergência",
      pixKey: "11999887766",
      pixKeyType: "PHONE",
      boletoUrl: null,
      boletoBarCode: null,
      recipientName: "Conta Investimentos",
      recipientCpfCnpj: null,
      date: new Date(now - 8 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "demo-tx-7",
      type: "BOLETO_CREATED",
      status: "CONFIRMED",
      amount: 89.9,
      fee: null,
      description: "Plano de Saúde",
      pixKey: null,
      pixKeyType: null,
      boletoUrl: null,
      boletoBarCode: "34191.75614 67250.101509 68108.060007 1 98500000008990",
      recipientName: "Hapvida NotreDame",
      recipientCpfCnpj: null,
      date: new Date(now - 10 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "demo-tx-8",
      type: "PIX_RECEIVED",
      status: "CONFIRMED",
      amount: 230.0,
      fee: null,
      description: "Venda — notebook usado",
      pixKey: null,
      pixKeyType: null,
      boletoUrl: null,
      boletoBarCode: null,
      recipientName: "Rafael Mendes",
      recipientCpfCnpj: null,
      date: new Date(now - 14 * 24 * 3600 * 1000).toISOString(),
    },
  ],
  totalCount: 8,
  hasMore: false,
};

/** Mock PIX keys */
export const DEMO_PIX_KEYS = {
  data: [
    { id: "demo-key-1", key: DEMO_EMAIL, keyType: "EMAIL", status: "ACTIVE" },
    {
      id: "demo-key-2",
      key: "11999887766",
      keyType: "PHONE",
      status: "ACTIVE",
    },
  ],
  totalCount: 2,
};

/** Mock PIX QR Code response */
export const demoPIXQrCode = (value?: number) => ({
  id: "demo-qrcode-" + Date.now(),
  encodedImage:
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  payload:
    "00020126360014br.gov.bcb.pix0114+5511999887766520400005303986" +
    (value ? `54${String(value.toFixed(2)).length.toString().padStart(2, "0")}${value.toFixed(2)}` : "") +
    "5802BR5913Joao Demo6009Sao Paulo6304A4B3",
  expirationDate: new Date(Date.now() + 3600 * 1000).toISOString(),
  value: value || 0,
});

/** Mock PIX transfer result */
export const demoPIXTransfer = (
  pixKey: string,
  amount: number,
  description?: string
) => ({
  id: "demo-pix-" + Date.now(),
  status: "DONE",
  value: amount,
  pixAddressKey: pixKey,
  description: description || "Transferência PIX",
  transferFee: 0,
  effectiveDate: new Date().toISOString(),
});

/** Mock boleto result */
export const demoBoleto = (
  amount: number,
  customerName: string,
  dueDate: string,
  description?: string
) => ({
  id: "demo-pay-" + Date.now(),
  status: "PENDING",
  value: amount,
  billingType: "BOLETO",
  dueDate,
  description: description || "Boleto GloryBank",
  barCode:
    "34191.09008 67629.640001 56900.630006 3 " +
    Math.floor(84690000000000 + amount * 100),
  bankSlipUrl: null,
  invoiceUrl: null,
  customer: customerName,
});

/** Mock transfer result */
export const demoTransfer = (
  amount: number,
  pixKey: string,
  description?: string
) => ({
  id: "demo-transfer-" + Date.now(),
  status: "DONE",
  value: amount,
  operationType: "PIX",
  pixAddressKey: pixKey,
  description: description || "Transferência",
  transferFee: 0,
  effectiveDate: new Date().toISOString(),
});

/** Mock notifications */
export const DEMO_NOTIFICATIONS = [
  {
    id: "demo-notif-1",
    userId: DEMO_USER_ID,
    title: "PIX recebido",
    message: "Você recebeu R$ 8.500,00 via PIX de Glory Tech Soluções Ltda",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-notif-2",
    userId: DEMO_USER_ID,
    title: "PIX enviado com sucesso",
    message: "Transferência de R$ 1.200,00 para Ana Souza realizada com sucesso",
    isRead: false,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-notif-3",
    userId: DEMO_USER_ID,
    title: "Boleto gerado",
    message: "Boleto de R$ 189,90 - Fatura Energia Elétrica gerado com vencimento em 10 dias",
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-notif-4",
    userId: DEMO_USER_ID,
    title: "Transferência agendada executada",
    message: "A transferência agendada de R$ 350,00 para Carrefour foi executada automaticamente",
    isRead: true,
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-notif-5",
    userId: DEMO_USER_ID,
    title: "Novo cartão virtual disponível",
    message: "Seu cartão virtual GloryBank Visa foi aprovado e já está disponível para uso",
    isRead: true,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "demo-notif-6",
    userId: DEMO_USER_ID,
    title: "Segurança: novo acesso",
    message: "Detectamos um novo acesso à sua conta às 14:32 de São Paulo, SP",
    isRead: true,
    createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
  },
];

/** Mock scheduled transfers */
export const DEMO_SCHEDULED_TRANSFERS = [
  {
    id: "demo-sched-1",
    pixKey: "ana.souza@gmail.com",
    pixKeyType: "EMAIL",
    amount: 1200.0,
    description: "Aluguel mensal",
    scheduledDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    recurrence: "MONTHLY",
    status: "SCHEDULED",
  },
  {
    id: "demo-sched-2",
    pixKey: "65.301.215/0001-90",
    pixKeyType: "CNPJ",
    amount: 350.0,
    description: "Supermercado semanal",
    scheduledDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    recurrence: "WEEKLY",
    status: "SCHEDULED",
  },
  {
    id: "demo-sched-3",
    pixKey: "11999887766",
    pixKeyType: "PHONE",
    amount: 500.0,
    description: "Investimento mensal",
    scheduledDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    recurrence: "MONTHLY",
    status: "SCHEDULED",
  },
];

/** Mock card requests */
export const DEMO_CARD_REQUESTS = [
  {
    id: "demo-card-1",
    cardType: "VIRTUAL",
    status: "ACTIVE",
    lastFour: "4829",
    brand: "Visa",
    cardName: "JOAO D SILVA",
    requestedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString(),
  },
];
