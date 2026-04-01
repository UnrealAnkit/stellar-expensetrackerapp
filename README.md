# 🌟 Stellar Expense Splitter

> **Stellar Journey to Mastery — Orange Belt Submission**
>
> A fully on-chain expense splitting dApp built on Stellar with Soroban smart contracts.
![Expense2](https://githu

https://github.com/user-attachments/assets/8062cc5a-0615-4627-bfd1-25bf0f0f4d0c

b.com/user-attachments/assets/a9d93673-8a62-4160-9a9c-e6f516591654)

---

## Overview![expense1](https://github.com/user-attachments/assets/92271c7f-136a-4c08-b9f0-7625a0e50763)


**Stellar Expense Splitter** lets a group of people create a shared expense (like a dinner bill), record it i![expense3](https://github.com/user-attachments/assets/db9aec1b-fb60-47fb-8592-2fefdf6ebde9)
mmutably on the Stellar blockchain via a Soroban smart contract, and let each participant mark their share as paid. Everything is transparent, permissionless, and verifiable on-chain.

### Key features

| Feature | Details |
|---|---|
| 🔗 Smart contract | Soroban (Rust) on Stellar testnet |
| 💼 Wallet integration | StellarWalletsKit — Freighter, xBull, Albedo, WalletConnect |
| ⚡ Frontend | Next.js 14 · TypeScript · Tailwind CSS |
| 🗄️ Caching | TanStack Query with stale-while-revalidate |
| ✅ Tests | Rust contract tests (7) + Frontend tests (Vitest, 13+) |
| 🎨 UI | Dark space-themed, glass morphism, responsive |

---

## Architecture

```
stellar-expense-splitter/
├── contract/                   # Soroban smart contract (Rust)
│   ├── src/
│   │   ├── lib.rs              # Contract implementation
│   │   └── test.rs             # Contract unit tests (7 tests)
│   └── Cargo.toml
└── frontend/                   # Next.js 14 app
    ├── src/
    │   ├── app/                # Next.js app router pages
    │   │   ├── layout.tsx      # Root layout + providers
    │   │   ├── page.tsx        # Dashboard
    │   │   └── expense/
    │   │       ├── create/page.tsx
    │   │       └── [id]/page.tsx
    │   ├── components/
    │   │   ├── layout/         # Navbar, Providers
    │   │   ├── wallet/         # WalletButton
    │   │   └── expense/        # ExpenseCard, Form, Detail, Feed, Stats
    │   ├── hooks/
    │   │   ├── useWallet.tsx   # Wallet context + StellarWalletsKit
    │   │   └── useExpenses.ts  # TanStack Query hooks
    │   ├── lib/
    │   │   └── contract.ts     # Soroban RPC + contract utilities
    │   ├── types/index.ts      # TypeScript types
    │   ├── styles/globals.css  # Tailwind + custom CSS
    │   └── test/
    │       ├── setup.ts
    │       └── expense.test.tsx
    ├── .env.example
    ├── next.config.js
    ├── tailwind.config.js
    ├── vitest.config.ts
    └── package.json
```

---

## Smart Contract

### Functions

| Function | Description |
|---|---|
| `create_expense(creator, title, total_amount, participant_count)` | Create a new expense on-chain. Returns `expense_id` |
| `get_expense(expense_id)` | Fetch a single expense by ID |
| `get_all_expenses()` | Fetch all expenses |
| `mark_paid(expense_id, user)` | Mark caller's payment on this expense |
| `has_paid(expense_id, user)` | Check if an address has paid |
| `get_payment_progress(expense_id)` | Get paid count, amount collected, is_fully_paid |
| `get_expense_count()` | Total number of expenses created |

### Validation rules

- `participant_count` must be > 0
- `total_amount` must be > 0
- The same wallet address **cannot** mark paid twice on the same expense
- Emits `created` event on expense creation
- Emits `paid` event when a payment is recorded

### Data types

```rust
pub struct Expense {
    pub id: u64,
    pub title: String,
    pub total_amount: i128,       // in stroops (1 XLM = 10_000_000 stroops)
    pub participant_count: u32,
    pub amount_per_person: i128,  // ceil(total / participants)
    pub creator: Address,
    pub created_at: u64,          // ledger timestamp
    pub paid_count: u32,
}

pub struct PaymentProgress {
    pub expense_id: u64,
    pub paid_count: u32,
    pub participant_count: u32,
    pub total_amount: i128,
    pub amount_collected: i128,
    pub is_fully_paid: bool,
}
```

---

## Local Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Stellar CLI | ≥ 21 | See below |
| Freighter wallet | latest | https://www.freighter.app |

**Install Stellar CLI:**
```bash
cargo install --locked stellar-cli --features opt
```

---

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/stellar-expense-splitter.git
cd stellar-expense-splitter
```

---

### 2. Set up testnet identity

```bash
# Generate a new keypair for deploying
stellar keys generate deployer --network testnet

# Fund with testnet XLM (friendbot)
stellar keys fund deployer --network testnet

# Check balance
stellar keys show deployer
```

---

### 3. Build the smart contract

```bash
cd contract

# Build to WASM
stellar contract build

# Output: target/wasm32-unknown-unknown/release/stellar_expense_splitter.wasm
```

---

### 4. Run contract tests

```bash
cd contract
cargo test
```

Expected output:
```
running 7 tests
test tests::test_create_expense_stores_correct_values ... ok
test tests::test_mark_paid_updates_payment_state ... ok
test tests::test_same_wallet_cannot_pay_twice ... ok
test tests::test_get_all_expenses_returns_all ... ok
test tests::test_zero_participants_panics ... ok
test tests::test_zero_amount_panics ... ok
test tests::test_payment_progress_tracks_correctly ... ok

test result: ok. 7 passed; 0 failed
```

---

### 5. Deploy to testnet

```bash
cd contract

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_expense_splitter.wasm \
  --source deployer \
  --network testnet
```

Save the output contract address, for example:
```
CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### 6. Set up frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### 7. Run the dev server

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

---

### 8. Run frontend tests

```bash
cd frontend
npm test
```

---

## Deployment (Production)

### Deploy contract to testnet (production)

Same as step 5 above. The Stellar testnet resets periodically — redeploy as needed.

### Deploy frontend to Vercel

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or via CLI:
vercel env add NEXT_PUBLIC_CONTRACT_ID
vercel env add NEXT_PUBLIC_STELLAR_NETWORK
vercel env add NEXT_PUBLIC_STELLAR_RPC_URL
vercel env add NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE
vercel env add NEXT_PUBLIC_STELLAR_HORIZON_URL

# Redeploy with env vars
vercel --prod
```

### Deploy frontend to Netlify

```bash
cd frontend
npm run build
# Deploy the `.next` folder to Netlify with the required env vars set in the dashboard
```

---

## Using the dApp

1. **Open** http://localhost:3000
2. **Connect wallet** — click "Connect Wallet" and choose Freighter (recommended for testnet)
3. **Create an expense** — click "New Expense", fill in title, total amount in XLM, and number of participants
4. **View expenses** — dashboard shows all on-chain expenses with progress bars
5. **Mark payment** — open an expense detail, click "Mark as Paid" to record your payment on-chain
6. **Track progress** — see real-time payment progress and who has/hasn't paid

> 💡 To test with multiple wallets: open the dApp in two different browsers, each connected with a different Freighter account.

---

## Contract Interaction (CLI)

You can also interact with the contract directly via the Stellar CLI:

```bash
# Create an expense
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- create_expense \
  --creator $(stellar keys address deployer) \
  --title "Team Lunch" \
  --total_amount 1000000000 \
  --participant_count 4

# Get all expenses
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_all_expenses

# Mark paid
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- mark_paid \
  --expense_id 1 \
  --user $(stellar keys address deployer)

# Get payment progress
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- get_payment_progress \
  --expense_id 1
```

---

## Error Handling

The dApp handles these error conditions gracefully:

| Error | User message |
|---|---|
| Wallet not found / not installed | "Wallet not found. Please install Freighter..." |
| User rejects transaction | "Transaction rejected by wallet" |
| Insufficient balance | "Insufficient balance to complete transaction" |
| Already paid | "You have already marked this expense as paid" |
| Network timeout | "Transaction timed out. Please check Stellar Explorer." |
| Expense not found | "Expense not found on-chain" |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Rust + Soroban SDK 21.7 |
| Blockchain | Stellar testnet |
| Frontend framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom CSS |
| Wallet | StellarWalletsKit v0.9 |
| Data fetching | TanStack Query v5 |
| Stellar SDK | @stellar/stellar-sdk v12 |
| Toasts | react-hot-toast |
| Icons | lucide-react |
| Testing (contract) | cargo test (soroban-sdk testutils) |
| Testing (frontend) | Vitest + React Testing Library |

---

## Submission

- **Belt**: 🟠 Orange Belt
- **Program**: Stellar Journey to Mastery
- **Network**: Stellar Testnet
- **Contract**: See deployed address in `.env.local`

---

## License

MIT
