// ─── Expense Types ────────────────────────────────────────────────────────────

export interface Expense {
  id: bigint;
  title: string;
  totalAmount: bigint;
  participantCount: number;
  amountPerPerson: bigint;
  creator: string;
  createdAt: bigint;
  paidCount: number;
}

export interface PaymentProgress {
  expenseId: bigint;
  paidCount: number;
  participantCount: number;
  totalAmount: bigint;
  amountCollected: bigint;
  isFullyPaid: boolean;
}

// ─── Contract Interaction Types ───────────────────────────────────────────────

export interface CreateExpenseParams {
  creator: string;
  title: string;
  totalAmount: bigint;
  participantCount: number;
}

export interface MarkPaidParams {
  expenseId: bigint;
  user: string;
}

// ─── UI / App Types ───────────────────────────────────────────────────────────

export type TxStatus = 'idle' | 'pending' | 'success' | 'failed';

export interface TransactionState {
  status: TxStatus;
  txHash?: string;
  error?: string;
}

export interface ActivityItem {
  id: string;
  type: 'expense_created' | 'payment_marked';
  expenseId: bigint;
  expenseTitle: string;
  actor: string;
  timestamp: number;
  amount?: bigint;
}

// ─── Wallet Types ─────────────────────────────────────────────────────────────

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  walletName: string | null;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export type AppError =
  | { type: 'wallet_not_found'; message: string }
  | { type: 'wallet_rejected'; message: string }
  | { type: 'insufficient_balance'; message: string }
  | { type: 'contract_error'; message: string }
  | { type: 'network_error'; message: string }
  | { type: 'unknown'; message: string };
