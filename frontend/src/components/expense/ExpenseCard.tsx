'use client';

import Link from 'next/link';
import { ArrowRight, Users, CheckCircle2, Clock } from 'lucide-react';
import { formatXLM, truncateAddress } from '@/lib/contract';
import type { Expense } from '@/types';
import { clsx } from 'clsx';

interface ExpenseCardProps {
  expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const pct = expense.participantCount > 0
    ? Math.round((expense.paidCount / expense.participantCount) * 100)
    : 0;
  const isFullyPaid = expense.paidCount >= expense.participantCount;

  return (
    <Link
      href={`/expense/${expense.id.toString()}`}
      className={clsx(
        'group block glass-card rounded-2xl p-5 transition-all duration-300',
        'hover:border-[rgba(59,158,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,158,255,0.08)]',
        'animate-fade-in'
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-semibold text-[var(--color-text)] truncate mb-1 group-hover:text-[var(--color-stellar)] transition-colors"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {expense.title}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] font-mono">
            #{expense.id.toString()} · by {truncateAddress(expense.creator, 4)}
          </p>
        </div>

        {/* Status badge */}
        {isFullyPaid ? (
          <span className="badge-success flex items-center gap-1 text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Settled
          </span>
        ) : (
          <span className="badge-pending flex items-center gap-1 text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )}
      </div>

      {/* Amount row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {formatXLM(expense.totalAmount)}
            <span className="text-sm font-medium text-[var(--color-text-muted)] ml-1">
              XLM
            </span>
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {formatXLM(expense.amountPerPerson)} XLM / person
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Users className="w-3.5 h-3.5" />
          <span>
            {expense.paidCount}/{expense.participantCount} paid
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="progress-track h-1.5 w-full">
          <div
            className="progress-fill h-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[var(--color-text-muted)]">
            {pct}% collected
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {formatXLM(expense.amountPerPerson * BigInt(expense.paidCount))} /{' '}
            {formatXLM(expense.totalAmount)} XLM
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          {new Date(Number(expense.createdAt) * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span className="flex items-center gap-1 text-xs text-[var(--color-stellar)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View details <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExpenseCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-1">
        <div className="skeleton h-7 w-32" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="skeleton h-1.5 w-full rounded-full" />
      <div className="flex justify-between">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-3 w-20" />
      </div>
    </div>
  );
}
