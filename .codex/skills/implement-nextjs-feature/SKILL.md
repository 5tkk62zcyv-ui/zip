---
name: implement-nextjs-feature
description: Implement TaxiTaShare PRD features in the existing Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn, and Neon-oriented application while preserving App Router server boundaries and current mobile UI patterns. Use for application code changes after the relevant domain, ledger, map, or database constraints are understood.
---

# Implement Next.js Feature

1. Read the requested FR/TR IDs and inspect the existing route, component, provider, and data patterns.
2. Ask `nextjs_neon_implementer` to own implementation when agent delegation is available. Provide exact file ownership and reviewer constraints.
3. Invoke only relevant installed official Vercel plugin skills:
   - `nextjs` for App Router, Server Components, Server Actions, caching, or routing.
   - `react-best-practices` for React behavior and performance.
   - `shadcn` for component-system work.
   - `vercel-functions` for runtime boundaries.
   - `env-vars` for configuration and secrets.
   - `vercel-storage` for Neon integration.
4. Keep authorization, input validation, point decisions, and state transitions on the server. Do not trust client or mock state.
5. Reuse existing mobile shell and UI components. Keep client boundaries narrow and expose loading, empty, error, disabled, and success states.
6. Modify only files required for the coherent feature slice. Do not add speculative abstractions or out-of-scope payment behavior.
7. Run type checking, linting, targeted tests, and build checks proportional to the change.
8. Hand the result to `$verify-mvp-release` and any affected specialist skill.
9. Report changed files, covered requirements, official plugin skills used, validation results, and unresolved decisions.

