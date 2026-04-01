'use client';

import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseCard, ExpenseCardSkeleton } from './ExpenseCard';
import { ActivityFeed } from './ActivityFeed';
import { StatsBar } from './StatsBar';
import { Plus, AlertCircle, RefreshCw, Receipt } from 'lucide-react';
import Link from 'next/link';

export function DashboardContent() {
  const { data: expenses, isLoading, error, refetch, isRefetching } =
    useExpenses();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero heading */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[var(--color-text)] leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Expense Splitter
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1 text-sm">
            Split bills on Stellar testnet · Powered by Soroban smart contracts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5 transition-all border border-[var(--color-border)] disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <Link
            href="/expense/create"
            className="btn-stellar flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          >
            <Plus className="w-4 h-4" />
            New Expense
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense list — takes 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          <h2
            className="text-base font-semibold text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            All Expenses
          </h2>

          {error ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-[var(--color-danger)] mx-auto mb-3" />
              <p className="text-[var(--color-text-muted)] text-sm mb-3">
                Failed to load expenses. Check your RPC URL in{' '}
                <code className="text-xs bg-white/5 px-1 py-0.5 rounded">
                  .env.local
                </code>
                .
              </p>
              <button
                onClick={() => refetch()}
                className="btn-stellar px-4 py-2 rounded-lg text-sm font-medium text-white"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <ExpenseCardSkeleton key={i} />
              ))}
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="space-y-4">
              {[...expenses]
                .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
                .map((expense) => (
                  <ExpenseCard key={expense.id.toString()} expense={expense} />
                ))}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Receipt className="w-10 h-10 text-[var(--color-border-strong)] mx-auto mb-3" />
              <p className="text-[var(--color-text-muted)] mb-4">
                No expenses on-chain yet.
              </p>
              <Link
                href="/expense/create"
                className="btn-stellar inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              >
                <Plus className="w-4 h-4" />
                Create First Expense
              </Link>
            </div>
          )}
        </div>

        {/* Activity feed — takes 1/3 */}
        <div>
          <h2
            className="text-base font-semibold text-[var(--color-text)] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Activity
          </h2>
          <ActivityFeed />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-muted)]">
          Stellar Journey to Mastery · Orange Belt Submission ·{' '}
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-stellar)] hover:underline"
          >
            stellar.org
          </a>
        </p>
      </div>
    </div>
  );
}
