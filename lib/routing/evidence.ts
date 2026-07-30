import { createHash, randomUUID } from 'node:crypto'
import type {
  Coordinates,
  RouteEstimateEvidence,
  RoutingProvider,
} from './types'

export function createRouteEvidence(input: {
  provider: RoutingProvider
  origin: Coordinates
  destination: Coordinates
  distanceMeters: number
  durationSeconds: number
  estimatedFareWon: number | null
}): RouteEstimateEvidence {
  const calculatedAt = new Date()
  const routeCalculationId = randomUUID()
  const requestTraceId = randomUUID()
  const requestFingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        provider: input.provider,
        origin: input.origin,
        destination: input.destination,
      }),
    )
    .digest('hex')

  return {
    provider: input.provider,
    distanceMeters: input.distanceMeters,
    durationSeconds: input.durationSeconds,
    estimatedFareWon: input.estimatedFareWon,
    calculatedAt: calculatedAt.toISOString(),
    expiresAt: new Date(calculatedAt.getTime() + 15 * 60_000).toISOString(),
    routeCalculationId,
    fareCalculationId:
      input.estimatedFareWon === null ? null : `fare-${routeCalculationId}`,
    requestTraceId,
    requestFingerprint,
    fareSource: 'PROVIDER',
    pricingPolicyKey: `${input.provider}-provider-taxi-fare`,
    pricingPolicyVersion: '1',
    calculationBasis: {
      provider: input.provider,
      routeCalculationId,
      distanceMeters: input.distanceMeters,
      durationSeconds: input.durationSeconds,
      fareField:
        input.estimatedFareWon === null ? null : 'provider_taxi_fare',
    },
  }
}
