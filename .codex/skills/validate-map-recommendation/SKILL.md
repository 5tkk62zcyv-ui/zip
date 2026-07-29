---
name: validate-map-recommendation
description: Design, implement, or review TaxiTaShare map-provider abstraction, place search, coordinate normalization, distance, travel time, fare estimation, nearby-destination matching, and evidence-based AI recommendation explanations. Use for Naver Map or Kakao Map integration, provider switching, recommendation ranking, recommendation cards, or any generated location, route, time, or fare claim.
---

# Validate Map Recommendation

1. Read FR-10–FR-15, FR-20–FR-22, TR-04, TR-05, and TR-08 in `docs/prd.md`.
2. Ask `map_recommendation_reviewer` to review provider boundaries, evidence, and failure modes when agent delegation is available.
3. Keep place search, geocoding, routing, and fare estimation behind provider-neutral contracts.
4. Normalize coordinate system, units, rounding, timestamps, and provider error types at the boundary.
5. Persist or trace candidate room ID, calculated distances, estimated time, fare source, calculation timestamp, ranking inputs, and explanation.
6. Generate natural-language reasons only from deterministic calculation results. Never let a model invent destinations, routes, time, or fares.
7. Handle timeouts, rate limits, stale cache, missing routes, provider degradation, and user-controlled nearby-destination radius.
8. Verify that recommendation never auto-applies or auto-confirms participation.
9. Return contracts, evidence fields, failure behavior, provider-switch tests, and relevant FR/TR IDs.

