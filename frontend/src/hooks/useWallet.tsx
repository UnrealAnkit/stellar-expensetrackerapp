'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  allowAllModules,
} from '@creit.tech/stellar-wallets-kit';
import {
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSignTransaction,
} from '@stellar/freighter-api';
import type { WalletState } from '@/types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface WalletContextValue {
  wallet: WalletState;
  kit: StellarWalletsKit | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  isConnecting: boolean;
  connectionError: string | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: null,
    walletName: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const kitRef = useRef<StellarWalletsKit | null>(null);

  // Initialize kit on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const network =
      process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
        ? WalletNetwork.PUBLIC
        : WalletNetwork.TESTNET;

    kitRef.current = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });

    // Restore persisted connection
    const saved = localStorage.getItem('stellar_wallet');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WalletState;
        if (parsed.connected && parsed.publicKey) {
          kitRef.current.setWallet(FREIGHTER_ID);
          setWallet(parsed);
        }
      } catch {
        localStorage.removeItem('stellar_wallet');
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!kitRef.current) {
      setConnectionError('Wallet kit not initialized');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      await kitRef.current.openModal({
        onWalletSelected: async (option) => {
          try {
            kitRef.current!.setWallet(option.id);

            // Freighter can block localhost origins; proactively request access first.
            if (option.id === FREIGHTER_ID) {
              await freighterRequestAccess();
            }

            const { address } = await kitRef.current!.getAddress();

            const state: WalletState = {
              connected: true,
              publicKey: address,
              walletName: option.name,
            };

            setWallet(state);
            localStorage.setItem('stellar_wallet', JSON.stringify(state));
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to get address';
            if (msg.includes('Origin not allowed')) {
              setConnectionError(
                'Freighter blocked this origin. Open Freighter Settings > Connected Apps/Blocked Apps, remove localhost, then reconnect.'
              );
            } else {
              setConnectionError(msg);
            }
          } finally {
            setIsConnecting(false);
          }
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wallet connection failed';

      if (msg.includes('not found') || msg.includes('not installed')) {
        setConnectionError('Wallet not found. Please install Freighter or another Stellar wallet.');
      } else if (msg.includes('rejected') || msg.includes('denied')) {
        setConnectionError('Connection rejected by user.');
      } else {
        setConnectionError(msg);
      }
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({ connected: false, publicKey: null, walletName: null });
    localStorage.removeItem('stellar_wallet');
  }, []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      if (!kitRef.current || !wallet.connected) {
        throw new Error('Wallet not connected');
      }

const networkPassphrase =
        process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
        (process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
          ? 'Public Global Stellar Network ; September 2015'
          : 'Test SDF Network ; September 2015');

      const isFreighter = wallet.walletName?.toLowerCase().includes('freighter');
      if (isFreighter && wallet.publicKey) {
        const result = (await freighterSignTransaction(xdr, {
          networkPassphrase,
          address: wallet.publicKey,
        })) as unknown as
          | string
          | { signedTxXdr?: string; error?: string | { message?: string } };

        if (typeof result === 'string') {
          return result;
        }

        if (result?.signedTxXdr) {
          return result.signedTxXdr;
        }

        const errText =
          typeof result?.error === 'string'
            ? result.error
            : result?.error?.message || 'Freighter failed to sign transaction';
        throw new Error(errText);
      }

      const { signedTxXdr } = await kitRef.current.signTransaction(xdr, {       
        networkPassphrase,
        address: wallet.publicKey!,
      });

      return signedTxXdr;
    },
    [wallet]
  );

  return (
    <WalletContext.Provider
      value={{
        wallet,
        kit: kitRef.current,
        connect,
        disconnect,
        signTransaction,
        isConnecting,
        connectionError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
