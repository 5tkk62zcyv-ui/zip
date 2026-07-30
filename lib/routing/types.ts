export type RoutingProvider = 'naver' | 'kakao'

export type Coordinates = {
  latitude: number
  longitude: number
}

export type PlaceResult = Coordinates & {
  label: string
  provider: RoutingProvider
  providerPlaceId: string
}

export type SelectablePlaceResult = PlaceResult & {
  selectionToken: string
}

export type RouteEstimate = {
  provider: RoutingProvider
  distanceMeters: number
  durationSeconds: number
  estimatedFareWon: number | null
  calculatedAt: string
}

export type RouteEstimateEvidence = RouteEstimate & {
  routeCalculationId: string
  fareCalculationId: string | null
  requestTraceId: string
  requestFingerprint: string
  expiresAt: string
  fareSource: 'PROVIDER'
  pricingPolicyKey: string
  pricingPolicyVersion: string
  calculationBasis: Readonly<Record<string, unknown>>
}

export interface RoutingAdapter {
  readonly provider: RoutingProvider
  searchPlaces(query: string): Promise<readonly PlaceResult[]>
  estimateRoute(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<RouteEstimateEvidence>
}
