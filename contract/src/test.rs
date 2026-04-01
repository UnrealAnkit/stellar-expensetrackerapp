#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Address, Env, String,
    };

    fn setup_env() -> (Env, Address, ExpenseSplitterContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ExpenseSplitterContract);
        let client = ExpenseSplitterContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        (env, creator, client)
    }

    // ── Test 1: create_expense stores correct values ──────────────────────────

    #[test]
    fn test_create_expense_stores_correct_values() {
        let (env, creator, client) = setup_env();

        let title = String::from_str(&env, "Team Dinner");
        let total_amount: i128 = 1_000_0000000; // 1000 XLM in stroops
        let participant_count: u32 = 4;

        let expense_id = client.create_expense(
            &creator,
            &title,
            &total_amount,
            &participant_count,
        );

        assert_eq!(expense_id, 1);

        let expense = client.get_expense(&expense_id);

        assert_eq!(expense.id, 1);
        assert_eq!(expense.title, String::from_str(&env, "Team Dinner"));
        assert_eq!(expense.total_amount, total_amount);
        assert_eq!(expense.participant_count, 4);
        assert_eq!(expense.paid_count, 0);
        assert_eq!(expense.creator, creator);

        // amount_per_person = ceil(1000_0000000 / 4) = 250_0000000
        assert_eq!(expense.amount_per_person, 250_0000000);
    }

    // ── Test 2: mark_paid updates payment state ────────────────────────────────

    #[test]
    fn test_mark_paid_updates_payment_state() {
        let (env, creator, client) = setup_env();

        let title = String::from_str(&env, "Lunch Split");
        let expense_id = client.create_expense(
            &creator,
            &title,
            &500_0000000i128,
            &2u32,
        );

        // Initially not paid
        assert!(!client.has_paid(&expense_id, &creator));

        // Mark as paid
        client.mark_paid(&expense_id, &creator);

        // Now should be paid
        assert!(client.has_paid(&expense_id, &creator));

        // paid_count should be 1
        let expense = client.get_expense(&expense_id);
        assert_eq!(expense.paid_count, 1);

        // Payment progress
        let progress = client.get_payment_progress(&expense_id);
        assert_eq!(progress.paid_count, 1);
        assert_eq!(progress.participant_count, 2);
        assert!(!progress.is_fully_paid);

        // Second person pays
        let user2 = Address::generate(&env);
        client.mark_paid(&expense_id, &user2);

        let progress2 = client.get_payment_progress(&expense_id);
        assert_eq!(progress2.paid_count, 2);
        assert!(progress2.is_fully_paid);
    }

    // ── Test 3: same wallet cannot mark paid twice ────────────────────────────

    #[test]
    #[should_panic(expected = "User has already marked this expense as paid")]
    fn test_same_wallet_cannot_pay_twice() {
        let (env, creator, client) = setup_env();

        let title = String::from_str(&env, "Coffee Run");
        let expense_id = client.create_expense(
            &creator,
            &title,
            &100_0000000i128,
            &3u32,
        );

        // First payment - should succeed
        client.mark_paid(&expense_id, &creator);

        // Second payment by same wallet - should panic
        client.mark_paid(&expense_id, &creator);
    }

    // ── Test 4: get_all_expenses returns all created expenses ─────────────────

    #[test]
    fn test_get_all_expenses_returns_all() {
        let (env, creator, client) = setup_env();

        assert_eq!(client.get_expense_count(), 0);

        client.create_expense(
            &creator,
            &String::from_str(&env, "Expense 1"),
            &100_0000000i128,
            &2u32,
        );
        client.create_expense(
            &creator,
            &String::from_str(&env, "Expense 2"),
            &200_0000000i128,
            &3u32,
        );
        client.create_expense(
            &creator,
            &String::from_str(&env, "Expense 3"),
            &300_0000000i128,
            &4u32,
        );

        assert_eq!(client.get_expense_count(), 3);

        let all = client.get_all_expenses();
        assert_eq!(all.len(), 3);
    }

    // ── Test 5: validation - zero participant_count panics ────────────────────

    #[test]
    #[should_panic(expected = "participant_count must be greater than 0")]
    fn test_zero_participants_panics() {
        let (env, creator, client) = setup_env();

        client.create_expense(
            &creator,
            &String::from_str(&env, "Bad Expense"),
            &100_0000000i128,
            &0u32,
        );
    }

    // ── Test 6: validation - zero total_amount panics ─────────────────────────

    #[test]
    #[should_panic(expected = "total_amount must be greater than 0")]
    fn test_zero_amount_panics() {
        let (env, creator, client) = setup_env();

        client.create_expense(
            &creator,
            &String::from_str(&env, "Bad Expense"),
            &0i128,
            &2u32,
        );
    }

    // ── Test 7: payment progress tracks correctly ─────────────────────────────

    #[test]
    fn test_payment_progress_tracks_correctly() {
        let (env, creator, client) = setup_env();

        let total = 400_0000000i128;
        let participants = 4u32;

        let expense_id = client.create_expense(
            &creator,
            &String::from_str(&env, "Group Dinner"),
            &total,
            &participants,
        );

        let p0 = client.get_payment_progress(&expense_id);
        assert_eq!(p0.paid_count, 0);
        assert_eq!(p0.amount_collected, 0);
        assert!(!p0.is_fully_paid);

        client.mark_paid(&expense_id, &creator);

        let p1 = client.get_payment_progress(&expense_id);
        assert_eq!(p1.paid_count, 1);
        assert_eq!(p1.amount_collected, 100_0000000); // 1/4 of total
        assert!(!p1.is_fully_paid);

        let u2 = Address::generate(&env);
        let u3 = Address::generate(&env);
        let u4 = Address::generate(&env);

        client.mark_paid(&expense_id, &u2);
        client.mark_paid(&expense_id, &u3);
        client.mark_paid(&expense_id, &u4);

        let p4 = client.get_payment_progress(&expense_id);
        assert_eq!(p4.paid_count, 4);
        assert!(p4.is_fully_paid);
        assert_eq!(p4.amount_collected, total);
    }
}
