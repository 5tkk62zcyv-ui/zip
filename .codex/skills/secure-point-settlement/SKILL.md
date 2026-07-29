---
name: secure-point-settlement
description: Design, implement, or review TaxiTaShare virtual-point ledger, admin grants, deposits, refunds, additional deductions, no-show handling, fare confirmation, and final settlement. Use whenever a change can alter balances, ledger records, settlement status, idempotency behavior, auditability, or sensitive financial-like data.
---

# Secure Point Settlement

1. Read FR-30–FR-40, FR-50–FR-54, TR-01–TR-03, and the cancellation/no-show policy in `docs/prd.md`.
2. Ask `ledger_security_reviewer` to review attack paths, concurrency, retries, and audit gaps when agent delegation is available.
3. Treat the ledger as append-only. Derive or atomically maintain balances without editing historical transactions.
4. Enforce authorization, positive bounded amounts, sufficient available balance, unique idempotency keys, and valid domain state on the server.
5. Execute ledger entries and settlement state changes in one database transaction. Define behavior for partial failure and retry.
6. Preserve the MVP boundary: points are administrator-issued virtual units, not user-purchased or withdrawable money.
7. Test duplicate requests, concurrent requests, insufficient balance, double refund, double deduction, no-show, dispute timeout, and transaction rollback.
8. Return affected FR/TR IDs, invariants, abuse cases, database protections, application checks, and test evidence.
9. Use `$evolve-neon-database` for schema or transaction changes and `$design-domain-workflow` for state changes.

