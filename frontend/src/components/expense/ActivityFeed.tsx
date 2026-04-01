'use client';

import { useExpenses } from '@/hooks/useExpenses';
import { formatXLM, truncateAddress } from '@/lib/contract';
import { Activity, PlusCircle, CheckCircle2 } from 'lucide-react';
import type { Expense } from '@/types';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: 'created';
  expense: Expense;
  timestamp: number;
}

function buildActivity(expenses: Expense[]): ActivityItem[] {
  return expenses
    .map((e) => ({
      id: `created-${e.id}`,
      type: 'created' as const,
      expense: e,
      timestamp: Number(e.createdAt),
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);
}

export function ActivityFeed() {
  const { data: expenses, isLoading } = useExpenses();

  const items = expenses ? buildActivity(expenses) : [];

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
        <Activity className="w-4 h-4 text-[var(--color-stellar)]" />
        <h2
          className="text-sm font-semibold text-[var(--color-text)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Recent Activity
        </h2>
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="divide-y divide-[var(--color-border)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-2.5 w-1/2" />
              </div>
              <div className="skeleton h-2.5 w-12" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Activity className="w-8 h-8 text-[var(--color-border-strong)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">
            No activity yet. Create your first expense!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/expense/${item.expense.id.toString()}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
            >
              {/* Icon */}
              <div className="w-7 h-7 rounded-full bg-[rgba(59,158,255,0.1)] border border-[rgba(59,158,255,0.2)] flex items-center justify-center flex-shrink-0">
                <PlusCircle className="w-3.5 h-3.5 text-[var(--color-stellar)]" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--color-text)] truncate group-hover:text-[var(--color-stellar)] transition-colors">
                  <span className="font-medium">{item.expense.title}</span>
                  {' · '}
                  <span className="text-[var(--color-text-muted)]">
                    {formatXLM(item.expense.totalAmount)} XLM
                  </span>
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  by {truncateAddress(item.expense.creator, 4)}
                  {' · '}
                  {item.expense.participantCount} participants
                </p>
              </div>

              {/* Time */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {relativeTime(item.timestamp)}
                </p>
                {item.expense.paidCount >= item.expense.participantCount ? (
                  <span className="flex items-center gap-0.5 text-xs text-[var(--color-success)] justify-end mt-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Settled
                  </span>
                ) : (
                  <span className="text-xs text-[var(--color-warning)] justify-end mt-0.5 block">
                    {item.expense.paidCount}/{item.expense.participantCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function relativeTime(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
