---
name: evolve-neon-database
description: Plan, implement, or review TaxiTaShare Neon PostgreSQL schemas, constraints, migrations, indexes, transactions, serverless connection management, environment isolation, backup, recovery, and database observability. Use for any persistent data model or query change, especially ledger, settlement, room-state, participant-state, audit, or deployment-environment changes.
---

# Evolve Neon Database

1. Read the PRD data-model draft, TR-02, TR-03, TR-06, and TR-07.
2. Ask `neon_database_reliability_reviewer` to review schema invariants, migration safety, and operations when agent delegation is available.
3. Use the installed official Vercel plugin's `vercel-storage` skill for current Neon/Vercel integration guidance. Use `env-vars` for environment separation and secrets. Do not copy either skill locally.
4. Define primary keys, foreign keys, uniqueness, checks, state representation, timestamps, audit fields, and deletion behavior.
5. Put cross-record financial and state updates inside explicit transactions. Back idempotency with a database uniqueness constraint.
6. Design forward-compatible migrations with ordering, validation, rollback or compensation, and safe handling of existing data.
7. Verify indexes against actual access paths and consider serverless pooling, connection lifetime, timeouts, and region placement.
8. Keep development, preview, and production data and secrets isolated.
9. State backup retention, restore procedure, recovery targets, monitoring, and alerting as open decisions when the repository does not define them.
10. Report schema impact, migration plan, query and concurrency tests, operational risks, and related FR/TR IDs.

