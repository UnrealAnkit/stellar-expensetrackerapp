import { Navbar } from '@/components/layout/Navbar';
import { ExpenseDetail } from '@/components/expense/ExpenseDetail';

interface Props {
  params: { id: string };
}

export default function ExpenseDetailPage({ params }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <ExpenseDetail expenseId={params.id} />
      </main>
    </div>
  );
}
