'use client';

import { useExpenses } from '@/hooks/useExpenses';
import { formatXLM } from '@/lib/contract';
import { Receipt, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

export function StatsBar() {
  const { data: expenses, isLoading } = useExpenses();

  const stats = useMemo(() => {
    if (!expenses) return null;
    const total = expenses.length;
    const settled = expenses.filter(
      (e) => e.paidCount >= e.participantCount
    ).length;
    const pending = total - settled;
    const totalXLM = expenses.reduce(
      (sum, e) => sum + e.totalAmount,
      BigInt(0)
    );
    return { total, settled, pending, totalXLM };
  }, [expenses]);

  const items = [
    {
      label: 'Total Expenses',
      value: stats?.total.toString() ?? '—',
      icon: Receipt,
      color: 'text-[var(--color-stellar)]',
    },
    {
      label: 'Settled',
      value: stats?.settled.toString() ?? '—',
      icon: CheckCircle2,
      color: 'text-[var(--color-success)]',
    },
    {
      label: 'Pending',
      value: stats?.pending.toString() ?? '—',
      icon: Clock,
      color: 'text-[var(--color-warning)]',
    },
    {
      label: 'Total Volume',
      value: stats ? `${formatXLM(stats.totalXLM)} XLM` : '—',
      icon: TrendingUp,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="glass-card rounded-xl px-4 py-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          {isLoading ? (
            <div className="skeleton h-6 w-16 rounded" />
          ) : (
            <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
