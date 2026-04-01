import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/layout/Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Stellar Expense Splitter',
  description:
    'Split expenses on-chain with Soroban smart contracts on Stellar testnet — Orange Belt submission',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>
          <div className="page-content">{children}</div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#131b33',
                color: '#e8edf8',
                border: '1px solid rgba(99,155,255,0.22)',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#22d3a0', secondary: '#131b33' },
              },
              error: {
                iconTheme: { primary: '#f43f5e', secondary: '#131b33' },
              },
              loading: {
                iconTheme: { primary: '#3b9eff', secondary: '#131b33' },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
