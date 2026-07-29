---
name: design-domain-workflow
description: Design or review TaxiTaShare domain models, room and participant state transitions, authorization boundaries, invariants, cancellation, expiry, no-show, and dispute flows against the PRD. Use before changing domain behavior, server actions, route handlers, persistence models, or UI flows whose validity depends on room or participant state.
---

# Design Domain Workflow

1. Read the relevant FR IDs and sections 9–10 of `docs/prd.md`.
2. Ask `domain_architect` to review the affected aggregate, actors, permissions, transitions, and invariants when agent delegation is available.
3. Define preconditions, authorized actor, state change, durable side effects, failure behavior, and retry behavior for each transition.
4. Check room and participant states together. Cover cancellation, manual and automatic close, expiry, no-show, insufficient participants, disputes, and settlement completion.
5. Separate explicit PRD policy from open decisions. Do not silently select a cancellation or penalty policy.
6. Express findings as:
   - Related FR/TR IDs
   - Current and target states
   - Invariants
   - Invalid transitions and authorization failures
   - Acceptance tests
7. Hand the approved boundaries to `$implement-nextjs-feature`; use `$secure-point-settlement` when a transition changes points or settlement.

