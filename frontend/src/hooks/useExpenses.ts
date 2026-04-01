import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getAllExpenses,
  getExpense,
  getPaymentProgress,
  hasPaid,
  createExpense,
  markPaid,
  parseContractError,
} from '@/lib/contract';
import type { CreateExpenseParams, MarkPaidParams } from '@/types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  expenses: ['expenses'] as const,
  expense: (id: bigint) => ['expense', id.toString()] as const,
  progress: (id: bigint) => ['progress', id.toString()] as const,
  hasPaid: (id: bigint, address: string) =>
    ['hasPaid', id.toString(), address] as const,
};

// ─── Read Hooks ───────────────────────────────────────────────────────────────

export function useExpenses() {
  return useQuery({
    queryKey: QUERY_KEYS.expenses,
    queryFn: getAllExpenses,
    staleTime: 30_000,       // 30 seconds
    gcTime: 5 * 60_000,      // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

export function useExpense(expenseId: bigint | null) {
  return useQuery({
    queryKey: QUERY_KEYS.expense(expenseId ?? BigInt(0)),
    queryFn: () => getExpense(expenseId!),
    enabled: expenseId !== null,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });
}

export function usePaymentProgress(expenseId: bigint | null) {
  return useQuery({
    queryKey: QUERY_KEYS.progress(expenseId ?? BigInt(0)),
    queryFn: () => getPaymentProgress(expenseId!),
    enabled: expenseId !== null,
    staleTime: 15_000,       // 15 seconds — refresh more often
    gcTime: 5 * 60_000,
    retry: 2,
  });
}

export function useHasPaid(expenseId: bigint | null, address: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.hasPaid(expenseId ?? BigInt(0), address ?? ''),
    queryFn: () => hasPaid(expenseId!, address!),
    enabled: expenseId !== null && address !== null,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateExpense(
  signTransaction: (xdr: string) => Promise<string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateExpenseParams) =>
      createExpense(params, signTransaction),

    onMutate: () => {
      toast.loading('Creating expense on-chain…', { id: 'create-expense' });
    },

    onSuccess: (data) => {
      toast.success(
        `Expense #${data.expenseId} created! Tx: ${data.txHash.slice(0, 8)}…`,
        { id: 'create-expense', duration: 5000 }
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
    },

    onError: (err) => {
      const msg = parseContractError(err);
      toast.error(msg, { id: 'create-expense', duration: 5000 });
    },
  });
}

export function useMarkPaid(
  signTransaction: (xdr: string) => Promise<string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: MarkPaidParams) =>
      markPaid(params, signTransaction),

    onMutate: (params) => {
      toast.loading('Recording payment on-chain…', { id: 'mark-paid' });
    },

    onSuccess: (txHash, params) => {
      toast.success(`Payment recorded! Tx: ${txHash.slice(0, 8)}…`, {
        id: 'mark-paid',
        duration: 5000,
      });
      // Invalidate affected queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.expense(params.expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.progress(params.expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.hasPaid(params.expenseId, params.user),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses });
    },

    onError: (err) => {
      const msg = parseContractError(err);
      toast.error(msg, { id: 'mark-paid', duration: 5000 });
    },
  });
}
