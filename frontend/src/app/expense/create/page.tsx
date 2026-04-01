import { Navbar } from '@/components/layout/Navbar';
import { CreateExpenseForm } from '@/components/expense/CreateExpenseForm';
import { Layers } from 'lucide-react';

export default function CreateExpensePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="animate-slide-up">
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 btn-stellar rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Create Expense
            </h1>
            <p className="text-[var(--color-text-muted)] text-sm mt-2">
              Store the expense on Stellar testnet via Soroban smart contract
            </p>
          </div>

          {/* Card */}
          <div className="glass-card-strong rounded-2xl p-6 sm:p-8">
            <CreateExpenseForm />
          </div>

          {/* Info */}
          <div className="mt-5 glass-card rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-[var(--color-text-muted)]">
              💡 The expense is stored permanently on the Stellar testnet blockchain
              via a Soroban smart contract. Participants can mark their share as
              paid from the expense detail page.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
