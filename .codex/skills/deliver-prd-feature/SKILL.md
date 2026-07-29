---
name: deliver-prd-feature
description: Coordinate end-to-end development of TaxiTaShare PRD features by tracing requirements, selecting project custom agents, invoking only relevant official Vercel plugin skills, implementing narrowly, and verifying acceptance criteria. Use for feature implementation, cross-cutting changes, milestone work, or requests that span more than one domain such as rooms, participation, points, settlement, maps, recommendations, Neon, or release readiness.
---

# Deliver PRD Feature

1. Read `docs/prd.md` and identify the exact FR/TR IDs, MVP scope, open issues, and affected states.
2. Inspect the current implementation before proposing changes. Treat mock behavior as non-authoritative for security and money decisions.
3. Select only the necessary project skills and agents:
   - State, authorization, cancellation, no-show, or dispute: `$design-domain-workflow` and `domain_architect`.
   - Points, deposits, refunds, deductions, or settlement: `$secure-point-settlement` and `ledger_security_reviewer`.
   - Maps, distance, time, fare estimates, or AI recommendations: `$validate-map-recommendation` and `map_recommendation_reviewer`.
   - Schema, migrations, transactions, connections, backup, or recovery: `$evolve-neon-database` and `neon_database_reliability_reviewer`.
   - Next.js or UI implementation: `$implement-nextjs-feature` and `nextjs_neon_implementer`.
   - Acceptance, accessibility, regression, or release: `$verify-mvp-release` and `product_quality_reviewer`.
4. Use the installed official Vercel plugin for Vercel ecosystem knowledge. Invoke only the relevant official skill; never copy it into this project.
5. Resolve reviewer findings before or during implementation. Keep unresolved PRD policy choices explicit rather than inventing product policy.
6. Implement the smallest coherent slice. Preserve server authority, ledger immutability, provider abstraction, and existing mobile UI patterns.
7. Run proportional type, lint, build, and targeted behavior checks.
8. Report changed files, covered FR/TR IDs, agent or skill findings applied, validation results, and remaining open decisions.

