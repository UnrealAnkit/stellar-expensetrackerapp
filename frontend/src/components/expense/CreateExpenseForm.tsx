'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useCreateExpense } from '@/hooks/useExpenses';
import { parseXLMToStroops } from '@/lib/contract';
import {
  DollarSign,
  Users,
  FileText,
  Loader2,
  AlertCircle,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FormData {
  title: string;
  totalAmount: string;
  participantCount: string;
}

interface FormErrors {
  title?: string;
  totalAmount?: string;
  participantCount?: string;
}

export function CreateExpenseForm() {
  const router = useRouter();
  const { wallet, connect, signTransaction } = useWallet();
  const createMutation = useCreateExpense(signTransaction);

  const [form, setForm] = useState<FormData>({
    title: '',
    totalAmount: '',
    participantCount: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.title.trim().length > 64)
      errs.title = 'Title must be 64 characters or less';

    const amt = parseFloat(form.totalAmount);
    if (!form.totalAmount || isNaN(amt) || amt <= 0)
      errs.totalAmount = 'Enter a valid amount greater than 0';
    if (amt > 1_000_000_000) errs.totalAmount = 'Amount too large';

    const cnt = parseInt(form.participantCount, 10);
    if (!form.participantCount || isNaN(cnt) || cnt < 1)
      errs.participantCount = 'At least 1 participant required';
    if (cnt > 100) errs.participantCount = 'Maximum 100 participants';

    return errs;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (!wallet.connected || !wallet.publicKey) {
      connect();
      return;
    }

    try {
      const totalAmount = parseXLMToStroops(form.totalAmount);
      const result = await createMutation.mutateAsync({
        creator: wallet.publicKey,
        title: form.title.trim(),
        totalAmount,
        participantCount: parseInt(form.participantCount, 10),
      });

      router.push(`/expense/${result.expenseId.toString()}`);
    } catch {
      // Error handled by mutation hook via toast
    }
  }

  // ── Per-person preview ──────────────────────────────────────────────────────

  const perPerson = (() => {
    const amt = parseFloat(form.totalAmount);
    const cnt = parseInt(form.participantCount, 10);
    if (isNaN(amt) || isNaN(cnt) || amt <= 0 || cnt < 1) return null;
    return (amt / cnt).toFixed(7);
  })();

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Title */}
      <Field
        label="Expense title"
        icon={<FileText className="w-4 h-4" />}
        error={errors.title}
      >
        <input
          type="text"
          className="input-stellar w-full px-4 py-3 rounded-xl text-sm"
          placeholder="e.g. Team dinner at Olive Garden"
          maxLength={64}
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <p className="text-xs text-[var(--color-text-muted)] text-right mt-1">
          {form.title.length}/64
        </p>
      </Field>

      {/* Amount + Participants - two columns */}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Total amount (XLM)"
          icon={<DollarSign className="w-4 h-4" />}
          error={errors.totalAmount}
        >
          <input
            type="number"
            step="0.0000001"
            min="0.0000001"
            className="input-stellar w-full px-4 py-3 rounded-xl text-sm"
            placeholder="e.g. 120.00"
            value={form.totalAmount}
            onChange={(e) =>
              setForm((f) => ({ ...f, totalAmount: e.target.value }))
            }
          />
        </Field>

        <Field
          label="Participants"
          icon={<Users className="w-4 h-4" />}
          error={errors.participantCount}
        >
          <input
            type="number"
            step="1"
            min="1"
            max="100"
            className="input-stellar w-full px-4 py-3 rounded-xl text-sm"
            placeholder="e.g. 4"
            value={form.participantCount}
            onChange={(e) =>
              setForm((f) => ({ ...f, participantCount: e.target.value }))
            }
          />
        </Field>
      </div>

      {/* Per-person preview */}
      {perPerson && (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in">
          <span className="text-sm text-[var(--color-text-muted)]">
            Each person owes
          </span>
          <span className="text-lg font-bold text-[var(--color-stellar)]">
            {perPerson} XLM
          </span>
        </div>
      )}

      {/* Submit */}
      {wallet.connected ? (
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="btn-stellar w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white disabled:opacity-60"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating on-chain…
            </>
          ) : (
            <>
              Create Expense
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={connect}
          className="btn-stellar w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet to Create
        </button>
      )}

      {/* Tx status notice */}
      {createMutation.isPending && (
        <div className="badge-info flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>
            Transaction submitted. Waiting for Stellar testnet confirmation…
          </span>
        </div>
      )}

      {createMutation.isError && (
        <div className="badge-failed flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : 'Transaction failed. Please try again.'}
          </span>
        </div>
      )}
    </form>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        <span className="text-[var(--color-stellar)]">{icon}</span>
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-[var(--color-danger)] animate-fade-in">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
