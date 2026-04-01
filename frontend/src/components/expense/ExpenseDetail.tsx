'use client';

import { useExpense, usePaymentProgress, useHasPaid, useMarkPaid } from '@/hooks/useExpenses';
import { useWallet } from '@/hooks/useWallet';
import { formatXLM, truncateAddress } from '@/lib/contract';
import {
  CheckCircle2,
  Clock,
  Users,
  ExternalLink,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

interface ExpenseDetailProps {
  expenseId: string;
}

export function ExpenseDetail({ expenseId }: ExpenseDetailProps) {
  const id = BigInt(expenseId);
  const { wallet, connect, signTransaction } = useWallet();

  const { data: expense, isLoading: loadingExpense, error: expenseError } = useExpense(id);
  const { data: progress, isLoading: loadingProgress } = usePaymentProgress(id);
  const { data: paid, isLoading: loadingPaid } = useHasPaid(
    id,
    wallet.publicKey
  );
  const markPaidMutation = useMarkPaid(signTransaction);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loadingExpense) return <ExpenseDetailSkeleton />;

  if (expenseError || !expense) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <AlertCircle className="w-8 h-8 text-[var(--color-danger)] mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">
          Expense not found or failed to load.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mt-4 text-sm text-[var(--color-stellar)] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const pct = expense.participantCount > 0
    ? Math.round((expense.paidCount / expense.participantCount) * 100)
    : 0;
  const isFullyPaid = expense.paidCount >= expense.participantCount;

  const handleMarkPaid = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      connect();
      return;
    }
    await markPaidMutation.mutateAsync({
      expenseId: id,
      user: wallet.publicKey,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All expenses
      </Link>

      {/* Header card */}
      <div className="glass-card-strong rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                Expense #{expense.id.toString()}
              </span>
              {isFullyPaid ? (
                <span className="badge-success flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Fully Paid
                </span>
              ) : (
                <span className="badge-pending flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
            </div>
            <h1
              className="text-2xl font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {expense.title}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Created by{' '}
              <a
                href={`https://stellar.expert/explorer/testnet/account/${expense.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-stellar)] font-mono hover:underline inline-flex items-center gap-0.5"
              >
                {truncateAddress(expense.creator, 6)}
                <ExternalLink className="w-3 h-3" />
              </a>
              {' · '}
              {new Date(Number(expense.createdAt) * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Total amount */}
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold text-[var(--color-text)]">
              {formatXLM(expense.totalAmount)}
              <span className="text-base font-medium text-[var(--color-text-muted)] ml-1">
                XLM
              </span>
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {formatXLM(expense.amountPerPerson)} XLM per person
            </p>
          </div>
        </div>

        {/* Progress section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-[var(--color-stellar)]" />
              <span className="text-[var(--color-text-muted)]">
                Payment progress
              </span>
            </div>
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {pct}%
            </span>
          </div>

          <div className="progress-track h-3 w-full">
            <div
              className="progress-fill h-full"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
              <Users className="w-4 h-4" />
              <span>
                <strong className="text-[var(--color-text)]">
                  {expense.paidCount}
                </strong>{' '}
                of{' '}
                <strong className="text-[var(--color-text)]">
                  {expense.participantCount}
                </strong>{' '}
                participants paid
              </span>
            </div>
            <span className="text-[var(--color-text-muted)]">
              {loadingProgress ? (
                <span className="skeleton inline-block h-4 w-24" />
              ) : (
                <>
                  {progress
                    ? formatXLM(progress.amountCollected)
                    : formatXLM(
                        expense.amountPerPerson * BigInt(expense.paidCount)
                      )}{' '}
                  / {formatXLM(expense.totalAmount)} XLM
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Amount"
          value={`${formatXLM(expense.totalAmount)} XLM`}
        />
        <StatCard
          label="Per Person"
          value={`${formatXLM(expense.amountPerPerson)} XLM`}
          highlight
        />
        <StatCard
          label="Paid"
          value={`${expense.paidCount} / ${expense.participantCount}`}
        />
        <StatCard
          label="Remaining"
          value={`${expense.participantCount - expense.paidCount} left`}
        />
      </div>

      {/* Mark paid action */}
      <div className="glass-card rounded-2xl p-6">
        <h2
          className="text-base font-semibold mb-4 text-[var(--color-text)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Your payment
        </h2>

        {!wallet.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Connect your wallet to mark your payment and record it on the
              Stellar blockchain.
            </p>
            <button
              onClick={connect}
              className="btn-stellar flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          </div>
        ) : loadingPaid ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking payment status…
          </div>
        ) : paid ? (
          <div className="badge-success flex items-center gap-2.5 px-4 py-3.5 rounded-xl">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">You've already paid!</p>
              <p className="text-xs opacity-80 mt-0.5">
                Your payment is recorded on-chain.
              </p>
            </div>
          </div>
        ) : isFullyPaid ? (
          <div className="badge-info flex items-center gap-2.5 px-4 py-3.5 rounded-xl">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>This expense is fully settled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">
                Your share:
              </span>
              <span className="font-bold text-[var(--color-stellar)]">
                {formatXLM(expense.amountPerPerson)} XLM
              </span>
            </div>
            <button
              onClick={handleMarkPaid}
              disabled={markPaidMutation.isPending}
              className="btn-stellar w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            >
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording on-chain…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Paid
                </>
              )}
            </button>

            {markPaidMutation.isPending && (
              <div className="badge-info flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs animate-fade-in">
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                Waiting for Stellar testnet confirmation…
              </div>
            )}

            {markPaidMutation.isError && (
              <div className="badge-failed flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs animate-fade-in">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>
                  {markPaidMutation.error instanceof Error
                    ? markPaidMutation.error.message
                    : 'Transaction failed. Please try again.'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stellar Explorer link */}
      <div className="text-center">
        <a
          href={`https://stellar.expert/explorer/testnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-stellar)] transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View on Stellar Expert Explorer
        </a>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl p-3 space-y-1',
        highlight
          ? 'bg-[rgba(59,158,255,0.08)] border border-[rgba(59,158,255,0.2)]'
          : 'glass-card'
      )}
    >
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p
        className={clsx(
          'text-sm font-bold',
          highlight ? 'text-[var(--color-stellar)]' : 'text-[var(--color-text)]'
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ExpenseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="glass-card-strong rounded-2xl p-6 space-y-4">
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-3 space-y-2">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </div>
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
