'use client';

import { useWallet } from '@/hooks/useWallet';
import { truncateAddress } from '@/lib/contract';
import { Wallet, LogOut, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export function WalletButton() {
  const { wallet, connect, disconnect, isConnecting, connectionError } =
    useWallet();
  const [showMenu, setShowMenu] = useState(false);

  if (wallet.connected && wallet.publicKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu((v) => !v)}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
            'glass-card border-[var(--color-border-strong)]',
            'hover:border-[rgba(59,158,255,0.3)] transition-all duration-200',
            'text-[var(--color-text)]'
          )}
        >
          {/* Green dot */}
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] shadow-[0_0_6px_var(--color-success)]" />
          <span className="hidden sm:inline text-[var(--color-text-muted)] text-xs">
            {wallet.walletName}
          </span>
          <span className="font-mono text-xs text-[var(--color-stellar)]">
            {truncateAddress(wallet.publicKey, 4)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-20 glass-card-strong rounded-xl overflow-hidden w-56 shadow-xl animate-slide-up">
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">
                  Connected wallet
                </p>
                <p
                  className="text-xs font-mono text-[var(--color-stellar)] break-all"
                >
                  {wallet.publicKey}
                </p>
              </div>
              <button
                onClick={() => {
                  disconnect();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-danger)] hover:bg-[rgba(244,63,94,0.08)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="btn-stellar flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {connectionError && (
        <p className="flex items-center gap-1 text-xs text-[var(--color-danger)] max-w-[200px] text-right">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {connectionError}
        </p>
      )}
    </div>
  );
}
