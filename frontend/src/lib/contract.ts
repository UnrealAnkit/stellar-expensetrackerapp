import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
  TimeoutInfinite,
  Account,
  Keypair,
} from '@stellar/stellar-sdk';
import type {
  Expense,
  PaymentProgress,
  CreateExpenseParams,
  MarkPaidParams,
} from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  'https://soroban-testnet.stellar.org';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || '';

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
  Networks.TESTNET;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateSetup(): string | null {
  if (!CONTRACT_ID || CONTRACT_ID.length === 0) {
    return 'Contract ID not configured in .env.local. Add NEXT_PUBLIC_CONTRACT_ID.';
  }
  if (!CONTRACT_ID.startsWith('C')) {
    return `Invalid Contract ID format: ${CONTRACT_ID}`;
  }
  return null;
}

// ─── RPC Client ───────────────────────────────────────────────────────────────

export const getRpcServer = () => new rpc.Server(RPC_URL);

// ─── Helper: Create dummy account for read-only calls ────────────────────────

function createDummyAccount(): Account {
  const dummyPublicKey = 'GAHCFK2GBLMW73EOI7244ROTHHQ2JPDSQEKNOVBAPO27RY2I7C6AA2N7';
  return new Account(dummyPublicKey, '0');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseExpense(val: xdr.ScVal): Expense {
  const native = scValToNative(val) as Record<string, unknown>;
  return {
    id: BigInt(String(native.id)),
    title: String(native.title),
    totalAmount: BigInt(String(native.total_amount)),
    participantCount: Number(native.participant_count),
    amountPerPerson: BigInt(String(native.amount_per_person)),
    creator: String(native.creator),
    createdAt: BigInt(String(native.created_at)),
    paidCount: Number(native.paid_count),
  };
}

function parsePaymentProgress(val: xdr.ScVal): PaymentProgress {
  const native = scValToNative(val) as Record<string, unknown>;
  return {
    expenseId: BigInt(String(native.expense_id)),
    paidCount: Number(native.paid_count),
    participantCount: Number(native.participant_count),
    totalAmount: BigInt(String(native.total_amount)),
    amountCollected: BigInt(String(native.amount_collected)),
    isFullyPaid: Boolean(native.is_fully_paid),
  };
}

async function simulateAndSend(
  server: rpc.Server,
  sourceAccount: { accountId(): string },
  operation: xdr.Operation,
  signTransaction: (xdr: string) => Promise<string>
): Promise<string> {
  const account = await server.getAccount(sourceAccount.accountId());

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(TimeoutInfinite)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, simResult).build();
  const signedXdr = await signTransaction(preparedTx.toXDR());

  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );

  if (response.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(response.errorResult)}`);
  }

  // Poll for confirmation
  let retries = 30;
  while (retries-- > 0) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await server.getTransaction(response.hash);
    if (status.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return response.hash;
    }
    if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction failed on-chain');
    }
  }

  throw new Error('Transaction confirmation timeout');
}

// ─── Read Functions ───────────────────────────────────────────────────────────

export async function getAllExpenses(): Promise<Expense[]> {
  // Validate setup
  const setupError = validateSetup();
  if (setupError) {
    throw new Error(setupError);
  }

  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);
  const account = createDummyAccount();

  try {
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_all_expenses'))
      .setTimeout(TimeoutInfinite)
      .build();

    const result = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(result)) {
      console.error('Simulation error:', result.error);
      throw new Error(
        `Contract simulation failed: ${result.error}. Verify CONTRACT_ID and RPC URL.`
      );
    }

    if (!result.result?.retval) {
      return [];
    }

    try {
      const native = scValToNative(result.result.retval);
      if (!Array.isArray(native)) {
        return [];
      }

      return (native as Record<string, unknown>[]).map((item) => ({
        id: BigInt(String(item.id)),
        title: String(item.title),
        totalAmount: BigInt(String(item.total_amount)),
        participantCount: Number(item.participant_count),
        amountPerPerson: BigInt(String(item.amount_per_person)),
        creator: String(item.creator),
        createdAt: BigInt(String(item.created_at)),
        paidCount: Number(item.paid_count),
      }));
    } catch (parseErr) {
      console.error('XDR parsing error:', parseErr);
      throw new Error(
        `Failed to parse contract response: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}. The contract may not exist on testnet.`
      );
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(
      `RPC connection failed: ${String(err)}. Check your RPC URL: ${RPC_URL}`
    );
  }
}

export async function getExpense(expenseId: bigint): Promise<Expense | null> {
  try {
    const setupError = validateSetup();
    if (setupError) {
      throw new Error(setupError);
    }

    const server = getRpcServer();
    const contract = new Contract(CONTRACT_ID);
    const account = createDummyAccount();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call('get_expense', nativeToScVal(expenseId, { type: 'u64' }))
      )
      .setTimeout(TimeoutInfinite)
      .build();

    const result = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(result) || !result.result?.retval) {
      return null;
    }

    try {
      const native = scValToNative(result.result.retval) as Record<string, unknown>;
      return {
        id: BigInt(String(native.id)),
        title: String(native.title),
        totalAmount: BigInt(String(native.total_amount)),
        participantCount: Number(native.participant_count),
        amountPerPerson: BigInt(String(native.amount_per_person)),
        creator: String(native.creator),
        createdAt: BigInt(String(native.created_at)),
        paidCount: Number(native.paid_count),
      };
    } catch (parseErr) {
      console.error('XDR parsing error in getExpense:', parseErr);
      return null;
    }
  } catch (err) {
    console.error('Error fetching expense:', err);
    return null;
  }
}

export async function getPaymentProgress(
  expenseId: bigint
): Promise<PaymentProgress | null> {
  try {
    const setupError = validateSetup();
    if (setupError) {
      throw new Error(setupError);
    }

    const server = getRpcServer();
    const contract = new Contract(CONTRACT_ID);
    const account = createDummyAccount();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'get_payment_progress',
          nativeToScVal(expenseId, { type: 'u64' })
        )
      )
      .setTimeout(TimeoutInfinite)
      .build();

    const result = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(result) || !result.result?.retval) {
      return null;
    }

    try {
      const native = scValToNative(result.result.retval) as Record<string, unknown>;
      return {
        expenseId: BigInt(String(native.expense_id)),
        paidCount: Number(native.paid_count),
        participantCount: Number(native.participant_count),
        totalAmount: BigInt(String(native.total_amount)),
        amountCollected: BigInt(String(native.amount_collected)),
        isFullyPaid: Boolean(native.is_fully_paid),
      };
    } catch (parseErr) {
      console.error('XDR parsing error in getPaymentProgress:', parseErr);
      return null;
    }
  } catch (err) {
    console.error('Error fetching payment progress:', err);
    return null;
  }
}

export async function hasPaid(
  expenseId: bigint,
  userAddress: string
): Promise<boolean> {
  try {
    const setupError = validateSetup();
    if (setupError) {
      return false;
    }

    const server = getRpcServer();
    const contract = new Contract(CONTRACT_ID);
    const account = createDummyAccount();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'has_paid',
          nativeToScVal(expenseId, { type: 'u64' }),
          new Address(userAddress).toScVal()
        )
      )
      .setTimeout(TimeoutInfinite)
      .build();

    const result = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(result) || !result.result?.retval) {
      return false;
    }

    try {
      return Boolean(scValToNative(result.result.retval));
    } catch (parseErr) {
      console.error('XDR parsing error in hasPaid:', parseErr);
      return false;
    }
  } catch (err) {
    console.error('Error checking payment status:', err);
    return false;
  }
}

// ─── Write Functions ──────────────────────────────────────────────────────────

export async function createExpense(
  params: CreateExpenseParams,
  signTransaction: (xdr: string) => Promise<string>
): Promise<{ txHash: string; expenseId: bigint }> {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);
  const account = await server.getAccount(params.creator);

  const operation = contract.call(
    'create_expense',
    new Address(params.creator).toScVal(),
    nativeToScVal(params.title, { type: 'string' }),
    nativeToScVal(params.totalAmount, { type: 'i128' }),
    nativeToScVal(params.participantCount, { type: 'u32' })
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(TimeoutInfinite)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, simResult).build();
  const signedXdr = await signTransaction(preparedTx.toXDR());
  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );

  if (response.status === 'ERROR') {
    throw new Error('Transaction submission failed');
  }

  // Poll
  let retries = 30;
  while (retries-- > 0) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await server.getTransaction(response.hash);
    if (status.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      const expenseId = status.returnValue
        ? BigInt(String(scValToNative(status.returnValue)))
        : BigInt(0);
      return { txHash: response.hash, expenseId };
    }
    if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction failed on-chain');
    }
  }

  throw new Error('Transaction confirmation timeout');
}

export async function markPaid(
  params: MarkPaidParams,
  signTransaction: (xdr: string) => Promise<string>
): Promise<string> {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);
  const account = await server.getAccount(params.user);

  const operation = contract.call(
    'mark_paid',
    nativeToScVal(params.expenseId, { type: 'u64' }),
    new Address(params.user).toScVal()
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(TimeoutInfinite)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = rpc.assembleTransaction(tx, simResult).build();
  const signedXdr = await signTransaction(preparedTx.toXDR());
  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  );

  if (response.status === 'ERROR') {
    throw new Error('Transaction submission failed');
  }

  let retries = 30;
  while (retries-- > 0) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await server.getTransaction(response.hash);
    if (status.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return response.hash;
    }
    if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction failed on-chain');
    }
  }

  throw new Error('Transaction confirmation timeout');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function formatXLM(stroops: bigint): string {
  const xlm = Number(stroops) / 10_000_000;
  return xlm.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

export function parseXLMToStroops(xlm: string): bigint {
  const amount = parseFloat(xlm);
  if (isNaN(amount) || amount <= 0) throw new Error('Invalid XLM amount');
  return BigInt(Math.round(amount * 10_000_000));
}

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function parseContractError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  // Configuration errors
  if (msg.includes('Contract ID not configured')) {
    return '⚠️ Setup required: Contract ID not configured. Check .env.local';
  }
  if (msg.includes('Invalid Contract ID format')) {
    return '⚠️ Invalid Contract ID format in .env.local';
  }
  if (msg.includes('contract may not exist on testnet')) {
    return '⚠️ Contract not found on testnet. Testnet may have reset — redeploy the contract.';
  }
  if (msg.includes('Failed to parse contract response') || msg.includes('XDR')) {
    return '⚠️ Bad union switch error — Contract ID or RPC URL may be incorrect.';
  }
  if (msg.includes('RPC connection failed') || msg.includes('not found')) {
    return '⚠️ RPC connection failed. Check your RPC URL in .env.local';
  }
  if (msg.includes('Contract simulation failed')) {
    return '⚠️ Contract not found or incompatible. Verify CONTRACT_ID and redeploy if needed.';
  }

  // Transaction errors
  if (msg.includes('wallet') || msg.includes('Wallet')) {
    return 'Wallet not found or not connected';
  }
  if (msg.includes('rejected') || msg.includes('declined') || msg.includes('User denied')) {
    return 'Transaction rejected by wallet';
  }
  if (msg.includes('Origin not allowed')) {
    return '⚠️ Origin not allowed - check wallet settings or network configuration.';
  }
  if (msg.includes('insufficient') || msg.includes('balance')) {
    return 'Insufficient balance to complete transaction';
  }
  if (msg.includes('already marked') || msg.includes('already paid')) {
    return 'You have already marked this expense as paid';
  }
  if (msg.includes('timeout')) {
    return 'Transaction timed out. Please check Stellar Explorer.';
  }
  return msg;
}
