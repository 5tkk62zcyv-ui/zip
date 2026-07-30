export type MapErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'NO_RESULT'
  | 'NO_ROUTE'
  | 'UPSTREAM_UNAVAILABLE'
  | 'MALFORMED_RESPONSE'
  | 'STALE_RESULT'
  | 'UNKNOWN'

export type GeoPoint = {
  crs: 'EPSG:4326'
  latitude: number
  longitude: number
}

export type ProviderEvidence = {
  providerKey: string
  requestId?: string
  traceId: string
}

export type PlaceCandidate = {
  placeId: string
  label: string
  address?: string
  point: GeoPoint
  provider: ProviderEvidence
}

export type PlaceSelection = PlaceCandidate & {
  source: 'SEARCH' | 'CURRENT_LOCATION'
}

export type RequestContext = {
  traceId: string
  deadlineAt: string
  locale: 'ko-KR'
}

export type RouteResult = {
  calculationId: string
  distanceMeters: number
  durationSeconds: number
  calculatedAt: string
  expiresAt: string
  provider: ProviderEvidence
}

export type FareResult = {
  calculationId: string
  estimatedFareWon: number
  depositPointsTotal: number
  calculatedAt: string
  expiresAt: string
  policyKey: string
  policyVersion: string
  source: 'PROVIDER' | 'POLICY'
  provider: ProviderEvidence
  calculationBasis: Readonly<Record<string, unknown>>
}

export interface PlaceProvider {
  search(
    input: {
      query: string
      bias?: GeoPoint
      limit: number
    },
    context: RequestContext,
  ): Promise<readonly PlaceCandidate[]>
}

export interface RouteProvider {
  route(
    input: {
      origin: GeoPoint
      destination: GeoPoint
      waypoints: readonly GeoPoint[]
      mode: 'TAXI'
    },
    context: RequestContext,
  ): Promise<RouteResult>
}

export interface FareEstimator {
  estimate(
    input: {
      route: RouteResult
      policyKey: string
      policyVersion: string
    },
    context: RequestContext,
  ): Promise<FareResult>
}

export class MapProviderError extends Error {
  constructor(
    readonly code: MapErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly traceId: string,
    readonly retryAfterMs?: number,
  ) {
    super(message)
    this.name = 'MapProviderError'
  }
}
