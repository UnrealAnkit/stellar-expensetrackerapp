import { Navbar } from '@/components/layout/Navbar';
import { DashboardContent } from '@/components/expense/DashboardContent';

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        <DashboardContent />
      </main>
    </div>
  );
}
