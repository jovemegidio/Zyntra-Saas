export interface User {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  asaasCustomerId: string | null;
  asaasAccountId: string | null;
  asaasWalletId: string | null;
  asaasApiKey: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface BalanceData {
  balance: number;
  pending: number;
  available: number;
}

export interface TransactionItem {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  date: string;
  recipientName: string | null;
}

export interface DashboardData {
  balance: BalanceData;
  recentTransactions: TransactionItem[];
  user: {
    name: string;
    email: string;
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ScheduledTransferItem {
  id: string;
  pixKey: string;
  pixKeyType: string;
  amount: number;
  description: string | null;
  scheduledDate: string;
  recurrence: string | null;
  status: string;
}

export interface CardRequestItem {
  id: string;
  cardType: string;
  status: string;
  lastFour: string | null;
  brand: string;
  cardName: string | null;
  requestedAt: string;
  approvedAt: string | null;
}
