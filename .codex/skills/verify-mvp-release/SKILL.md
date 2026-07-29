---
name: verify-mvp-release
description: Verify TaxiTaShare changes and release candidates against PRD Must requirements, launch approval criteria, mobile accessibility, complete user journeys, edge cases, regression risk, build health, and Vercel deployment readiness. Use after feature implementation, before merging or deployment, for bug-fix verification, or when assessing MVP completeness.
---

# Verify MVP Release

1. Read the affected FR/TR IDs and section 14 launch approval criteria in `docs/prd.md`.
2. Ask `product_quality_reviewer` for a severity-ordered acceptance and regression review when agent delegation is available.
3. Build a traceability list from requirement to observable result and test evidence.
4. Exercise complete flows: signup, room creation, recommendation, participation, approval, deposit, gathering, no-show or cancellation, actual fare confirmation or dispute, and settlement.
5. Cover boundaries and failures: 2–4 people, closed or expired rooms, duplicate requests, insufficient points, network errors, stale state, provider failure, and retry.
6. Check mobile one-hand use, keyboard navigation, focus, labels, semantic controls, non-color status communication, loading, empty, error, and recovery states.
7. Run type, lint, targeted tests, and production build checks. Do not claim unexecuted checks passed.
8. For current Vercel behavior, use only the installed official plugin:
   - `verification` or `agent-browser-verify` for browser verification.
   - `deployments-cicd`, `env-vars`, and `observability` for release readiness.
   - `performance-optimizer` plugin agent for Core Web Vitals or performance investigations.
9. Do not deploy unless explicitly requested.
10. Report blockers first, then requirement coverage, evidence, residual risk, and open product or operational decisions.

