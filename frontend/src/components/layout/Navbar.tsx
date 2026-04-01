'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, LayoutDashboard, Plus } from 'lucide-react';
import { WalletButton } from '@/components/wallet/WalletButton';
import { clsx } from 'clsx';

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/expense/create', label: 'New Expense', icon: Plus },
  ];

  return (
    <header className="sticky top-0 z-50 glass-card-strong border-b border-[var(--color-border-strong)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg btn-stellar flex items-center justify-center shadow-lg">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-base font-bold tracking-tight hidden sm:block"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            StellarSplit
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                pathname === href
                  ? 'text-[var(--color-stellar)] bg-[rgba(59,158,255,0.1)] border border-[rgba(59,158,255,0.2)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <WalletButton />
      </div>
    </header>
  );
}
