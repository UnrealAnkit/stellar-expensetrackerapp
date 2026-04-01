#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, String, Symbol, Vec,
    log,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const EXPENSE_COUNT: Symbol = symbol_short!("EXP_CNT");
const EXPENSE_PREFIX: Symbol = symbol_short!("EXP");
const PAYMENTS_PREFIX: Symbol = symbol_short!("PAY");
const ALL_EXPENSES: Symbol = symbol_short!("ALL_EXP");

// ─── Data Types ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct Expense {
    pub id: u64,
    pub title: String,
    pub total_amount: i128,
    pub participant_count: u32,
    pub amount_per_person: i128,
    pub creator: Address,
    pub created_at: u64,
    pub paid_count: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PaymentProgress {
    pub expense_id: u64,
    pub paid_count: u32,
    pub participant_count: u32,
    pub total_amount: i128,
    pub amount_collected: i128,
    pub is_fully_paid: bool,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct ExpenseSplitterContract;

#[contractimpl]
impl ExpenseSplitterContract {

    /// Create a new expense and store it on-chain.
    /// Returns the new expense ID.
    pub fn create_expense(
        env: Env,
        creator: Address,
        title: String,
        total_amount: i128,
        participant_count: u32,
    ) -> u64 {
        // Validate inputs
        if participant_count == 0 {
            panic!("participant_count must be greater than 0");
        }
        if total_amount <= 0 {
            panic!("total_amount must be greater than 0");
        }

        // Require authorization from creator
        creator.require_auth();

        // Get and increment expense counter
        let expense_id: u64 = env
            .storage()
            .persistent()
            .get(&EXPENSE_COUNT)
            .unwrap_or(0u64)
            + 1;

        env.storage()
            .persistent()
            .set(&EXPENSE_COUNT, &expense_id);

        // Calculate amount per person (integer division, rounded up)
        let amount_per_person = (total_amount + participant_count as i128 - 1)
            / participant_count as i128;

        let expense = Expense {
            id: expense_id,
            title: title.clone(),
            total_amount,
            participant_count,
            amount_per_person,
            creator: creator.clone(),
            created_at: env.ledger().timestamp(),
            paid_count: 0,
        };

        // Store expense
        let expense_key = (EXPENSE_PREFIX, expense_id);
        env.storage().persistent().set(&expense_key, &expense);

        // Initialize payments map (empty)
        let payments: Map<Address, bool> = Map::new(&env);
        let payments_key = (PAYMENTS_PREFIX, expense_id);
        env.storage().persistent().set(&payments_key, &payments);

        // Update all-expenses list
        let all_key = ALL_EXPENSES;
        let mut all_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&all_key)
            .unwrap_or(Vec::new(&env));
        all_ids.push_back(expense_id);
        env.storage().persistent().set(&all_key, &all_ids);

        // Emit event
        env.events().publish(
            (symbol_short!("created"), creator.clone()),
            (expense_id, title, total_amount, participant_count),
        );

        log!(&env, "Expense created: id={}, total={}", expense_id, total_amount);

        expense_id
    }

    /// Retrieve a single expense by ID.
    pub fn get_expense(env: Env, expense_id: u64) -> Expense {
        let key = (EXPENSE_PREFIX, expense_id);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Expense not found"))
    }

    /// Retrieve all expenses.
    pub fn get_all_expenses(env: Env) -> Vec<Expense> {
        let all_key = ALL_EXPENSES;
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&all_key)
            .unwrap_or(Vec::new(&env));

        let mut expenses: Vec<Expense> = Vec::new(&env);
        for id in ids.iter() {
            let key = (EXPENSE_PREFIX, id);
            if let Some(expense) = env.storage().persistent().get::<_, Expense>(&key) {
                expenses.push_back(expense);
            }
        }
        expenses
    }

    /// Mark a payment as paid for a given expense.
    pub fn mark_paid(env: Env, expense_id: u64, user: Address) {
        // Require authorization from the payer
        user.require_auth();

        // Load expense
        let expense_key = (EXPENSE_PREFIX, expense_id);
        let mut expense: Expense = env
            .storage()
            .persistent()
            .get(&expense_key)
            .unwrap_or_else(|| panic!("Expense not found"));

        // Load payments map
        let payments_key = (PAYMENTS_PREFIX, expense_id);
        let mut payments: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&payments_key)
            .unwrap_or_else(|| Map::new(&env));

        // Check if already paid
        if payments.get(user.clone()).unwrap_or(false) {
            panic!("User has already marked this expense as paid");
        }

        // Check participant limit
        if expense.paid_count >= expense.participant_count {
            panic!("All participants have already paid");
        }

        // Record payment
        payments.set(user.clone(), true);
        expense.paid_count += 1;

        // Persist updates
        env.storage().persistent().set(&expense_key, &expense);
        env.storage().persistent().set(&payments_key, &payments);

        // Emit event
        env.events().publish(
            (symbol_short!("paid"), user.clone()),
            (expense_id, user.clone(), expense.paid_count),
        );

        log!(
            &env,
            "Payment marked: expense_id={}, user={:?}, paid_count={}",
            expense_id,
            user,
            expense.paid_count
        );
    }

    /// Check if a user has paid for an expense.
    pub fn has_paid(env: Env, expense_id: u64, user: Address) -> bool {
        let payments_key = (PAYMENTS_PREFIX, expense_id);
        let payments: Map<Address, bool> = env
            .storage()
            .persistent()
            .get(&payments_key)
            .unwrap_or_else(|| Map::new(&env));
        payments.get(user).unwrap_or(false)
    }

    /// Get payment progress for an expense.
    pub fn get_payment_progress(env: Env, expense_id: u64) -> PaymentProgress {
        let key = (EXPENSE_PREFIX, expense_id);
        let expense: Expense = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Expense not found"));

        let amount_collected = expense.amount_per_person * expense.paid_count as i128;
        let is_fully_paid = expense.paid_count >= expense.participant_count;

        PaymentProgress {
            expense_id,
            paid_count: expense.paid_count,
            participant_count: expense.participant_count,
            total_amount: expense.total_amount,
            amount_collected,
            is_fully_paid,
        }
    }

    /// Get total number of expenses.
    pub fn get_expense_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&EXPENSE_COUNT)
            .unwrap_or(0u64)
    }
}
