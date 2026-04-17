const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";

interface AsaasRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  apiKey?: string;
}

async function asaasRequest<T>({
  method,
  path,
  body,
  apiKey,
}: AsaasRequestOptions): Promise<T> {
  const key = apiKey || ASAAS_API_KEY;

  if (!key) {
    throw new Error("Asaas API key not configured");
  }

  const response = await fetch(`${ASAAS_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Asaas API error: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json();
}

// ============ SUB-ACCOUNTS ============

export interface CreateSubAccountData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  mobilePhone?: string;
  birthDate?: string;
  address?: string;
  addressNumber?: string;
  province?: string;
  postalCode?: string;
  companyType?: string;
}

export interface SubAccountResponse {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  apiKey: string;
  walletId: string;
  accountNumber?: {
    agency: string;
    account: string;
    accountDigit: string;
  };
}

export async function createSubAccount(
  data: CreateSubAccountData
): Promise<SubAccountResponse> {
  return asaasRequest<SubAccountResponse>({
    method: "POST",
    path: "/accounts",
    body: {
      ...data,
      companyType: data.companyType || "MEI",
    },
  });
}

// ============ BALANCE ============

export interface BalanceResponse {
  balance: number;
  statistics: {
    pending: number;
    overdue: number;
    confirmed: number;
  };
}

export async function getBalance(apiKey: string): Promise<BalanceResponse> {
  const [balance, statistics] = await Promise.all([
    asaasRequest<{ balance: number }>({
      method: "GET",
      path: "/finance/balance",
      apiKey,
    }),
    asaasRequest<{ pending: number; overdue: number; confirmed: number }>({
      method: "GET",
      path: "/finance/statistics",
      apiKey,
    }).catch(() => ({ pending: 0, overdue: 0, confirmed: 0 })),
  ]);

  return {
    balance: balance.balance,
    statistics,
  };
}

// ============ PIX ============

export interface PixTransferData {
  value: number;
  pixAddressKey: string;
  pixAddressKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP";
  description?: string;
}

export interface PixTransferResponse {
  id: string;
  value: number;
  status: string;
  pixTransaction?: {
    endToEndIdentifier: string;
  };
}

export async function createPixTransfer(
  data: PixTransferData,
  apiKey: string
): Promise<PixTransferResponse> {
  return asaasRequest<PixTransferResponse>({
    method: "POST",
    path: "/pix/transactions",
    body: data as unknown as Record<string, unknown>,
    apiKey,
  });
}

export interface PixQrCodeData {
  addressKey: string;
  description?: string;
  value?: number;
  format?: "ALL" | "IMAGE" | "PAYLOAD";
  expirationDate?: string;
  expirationSeconds?: number;
  allowsMultiplePayments?: boolean;
}

export interface PixQrCodeResponse {
  id: string;
  encodedImage: string;
  payload: string;
  allowsMultiplePayments: boolean;
  expirationDate: string;
}

export async function createPixQrCode(
  data: PixQrCodeData,
  apiKey: string
): Promise<PixQrCodeResponse> {
  return asaasRequest<PixQrCodeResponse>({
    method: "POST",
    path: "/pix/qrCodes/static",
    body: data as unknown as Record<string, unknown>,
    apiKey,
  });
}

export interface PixKeyResponse {
  id: string;
  key: string;
  type: string;
  status: string;
}

export async function getPixKeys(apiKey: string): Promise<{ data: PixKeyResponse[] }> {
  return asaasRequest<{ data: PixKeyResponse[] }>({
    method: "GET",
    path: "/pix/addressKeys",
    apiKey,
  });
}

export async function createPixKey(
  type: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP",
  apiKey: string
): Promise<PixKeyResponse> {
  return asaasRequest<PixKeyResponse>({
    method: "POST",
    path: "/pix/addressKeys",
    body: { type },
    apiKey,
  });
}

// ============ BOLETO / PAYMENTS ============

export interface CreatePaymentData {
  customer: string;
  billingType: "BOLETO" | "PIX" | "CREDIT_CARD";
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}

export interface PaymentResponse {
  id: string;
  customer: string;
  value: number;
  status: string;
  billingType: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  nossoNumero?: string;
  barCode?: string;
}

export async function createPayment(
  data: CreatePaymentData,
  apiKey: string
): Promise<PaymentResponse> {
  return asaasRequest<PaymentResponse>({
    method: "POST",
    path: "/payments",
    body: data as unknown as Record<string, unknown>,
    apiKey,
  });
}

// ============ TRANSFERS ============

export interface TransferData {
  value: number;
  bankAccount?: {
    bank: { code: string };
    accountName: string;
    ownerName: string;
    ownerBirthDate: string;
    cpfCnpj: string;
    agency: string;
    account: string;
    accountDigit: string;
    bankAccountType: "CONTA_CORRENTE" | "CONTA_POUPANCA";
  };
  operationType: "PIX" | "TED" | "INTERNAL";
  pixAddressKey?: string;
  pixAddressKeyType?: string;
  description?: string;
}

export interface TransferResponse {
  id: string;
  value: number;
  status: string;
  transferFee: number;
  operationType: string;
}

export async function createTransfer(
  data: TransferData,
  apiKey: string
): Promise<TransferResponse> {
  return asaasRequest<TransferResponse>({
    method: "POST",
    path: "/transfers",
    body: data as unknown as Record<string, unknown>,
    apiKey,
  });
}

// ============ TRANSACTIONS / STATEMENTS ============

export interface FinancialTransaction {
  id: string;
  value: number;
  balance: number;
  type: string;
  date: string;
  description: string;
  transactionType: string;
}

export interface TransactionsResponse {
  data: FinancialTransaction[];
  hasMore: boolean;
  totalCount: number;
}

export async function getTransactions(
  apiKey: string,
  params?: {
    offset?: number;
    limit?: number;
    startDate?: string;
    finishDate?: string;
  }
): Promise<TransactionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.finishDate) searchParams.set("finishDate", params.finishDate);

  const query = searchParams.toString();
  return asaasRequest<TransactionsResponse>({
    method: "GET",
    path: `/financialTransactions${query ? `?${query}` : ""}`,
    apiKey,
  });
}

// ============ CUSTOMER (for boleto payments) ============

export interface CustomerData {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}

export interface CustomerResponse {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
}

export async function createCustomer(
  data: CustomerData,
  apiKey: string
): Promise<CustomerResponse> {
  return asaasRequest<CustomerResponse>({
    method: "POST",
    path: "/customers",
    body: data as unknown as Record<string, unknown>,
    apiKey,
  });
}

export async function getCustomers(
  apiKey: string,
  cpfCnpj?: string
): Promise<{ data: CustomerResponse[] }> {
  const query = cpfCnpj ? `?cpfCnpj=${cpfCnpj}` : "";
  return asaasRequest<{ data: CustomerResponse[] }>({
    method: "GET",
    path: `/customers${query}`,
    apiKey,
  });
}
