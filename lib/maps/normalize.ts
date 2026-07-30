import {
  MapProviderError,
  type FareResult,
  type GeoPoint,
  type ProviderEvidence,
  type RouteResult,
} from './contracts'

const MAX_AMOUNT = 1_000_000

function nonBlank(value: unknown, field: string, traceId: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw malformed(`${field} 값이 올바르지 않습니다.`, traceId)
  }
  return value.trim()
}

function safeInteger(
  value: unknown,
  field: string,
  traceId: string,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw malformed(`${field} 값이 올바르지 않습니다.`, traceId)
  }
  return value
}

function utcInstant(value: unknown, field: string, traceId: string) {
  if (
    typeof value !== 'string' ||
    !value.endsWith('Z') ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw malformed(`${field} 시각이 올바르지 않습니다.`, traceId)
  }
  return new Date(value).toISOString()
}

function malformed(message: string, traceId: string) {
  return new MapProviderError(
    'MALFORMED_RESPONSE',
    message,
    false,
    traceId,
  )
}

export function normalizeGeoPoint(
  input: { latitude: unknown; longitude: unknown },
  traceId: string,
): GeoPoint {
  if (
    typeof input.latitude !== 'number' ||
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    typeof input.longitude !== 'number' ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  ) {
    throw malformed('좌표가 WGS84 범위를 벗어났습니다.', traceId)
  }
  return {
    crs: 'EPSG:4326',
    latitude: input.latitude,
    longitude: input.longitude,
  }
}

export function normalizeProviderEvidence(
  input: {
    providerKey: unknown
    requestId?: unknown
    traceId: unknown
  },
): ProviderEvidence {
  const traceId =
    typeof input.traceId === 'string' && input.traceId.trim()
      ? input.traceId.trim()
      : 'unknown'
  return {
    providerKey: nonBlank(input.providerKey, '제공자', traceId),
    requestId:
      input.requestId === undefined
        ? undefined
        : nonBlank(input.requestId, '요청 ID', traceId),
    traceId,
  }
}

export function normalizeRouteResult(input: {
  calculationId: unknown
  distanceMeters: unknown
  durationSeconds: unknown
  calculatedAt: unknown
  expiresAt: unknown
  provider: ProviderEvidence
}): RouteResult {
  const traceId = input.provider.traceId
  const calculatedAt = utcInstant(input.calculatedAt, '경로 산정', traceId)
  const expiresAt = utcInstant(input.expiresAt, '경로 만료', traceId)
  if (Date.parse(expiresAt) <= Date.parse(calculatedAt)) {
    throw malformed('경로 만료 시각이 산정 시각보다 늦어야 합니다.', traceId)
  }
  return {
    calculationId: nonBlank(input.calculationId, '경로 계산 ID', traceId),
    distanceMeters: safeInteger(
      input.distanceMeters,
      '경로 거리(m)',
      traceId,
    ),
    durationSeconds: safeInteger(
      input.durationSeconds,
      '예상 시간(초)',
      traceId,
    ),
    calculatedAt,
    expiresAt,
    provider: input.provider,
  }
}

export function normalizeFareResult(input: {
  calculationId: unknown
  estimatedFareWon: unknown
  depositPointsTotal: unknown
  calculatedAt: unknown
  expiresAt: unknown
  policyKey: unknown
  policyVersion: unknown
  source: unknown
  provider: ProviderEvidence
  calculationBasis: unknown
}): FareResult {
  const traceId = input.provider.traceId
  const calculatedAt = utcInstant(input.calculatedAt, '요금 산정', traceId)
  const expiresAt = utcInstant(input.expiresAt, '요금 만료', traceId)
  if (Date.parse(expiresAt) <= Date.parse(calculatedAt)) {
    throw malformed('요금 만료 시각이 산정 시각보다 늦어야 합니다.', traceId)
  }
  if (input.source !== 'PROVIDER' && input.source !== 'POLICY') {
    throw malformed('요금 출처가 올바르지 않습니다.', traceId)
  }
  if (
    !input.calculationBasis ||
    typeof input.calculationBasis !== 'object' ||
    Array.isArray(input.calculationBasis) ||
    !Object.keys(input.calculationBasis).length
  ) {
    throw malformed('요금 계산 근거가 필요합니다.', traceId)
  }
  return {
    calculationId: nonBlank(input.calculationId, '요금 계산 ID', traceId),
    estimatedFareWon: positiveAmount(
      input.estimatedFareWon,
      '예상 요금',
      traceId,
    ),
    depositPointsTotal: positiveAmount(
      input.depositPointsTotal,
      '예치 포인트',
      traceId,
    ),
    calculatedAt,
    expiresAt,
    policyKey: nonBlank(input.policyKey, '요금 정책', traceId),
    policyVersion: nonBlank(input.policyVersion, '요금 정책 버전', traceId),
    source: input.source,
    provider: input.provider,
    calculationBasis: input.calculationBasis as Readonly<
      Record<string, unknown>
    >,
  }
}

function positiveAmount(value: unknown, field: string, traceId: string) {
  const amount = safeInteger(value, field, traceId, MAX_AMOUNT)
  if (amount === 0) throw malformed(`${field}은 1 이상이어야 합니다.`, traceId)
  return amount
}

export function assertFreshResult(
  result: Pick<RouteResult | FareResult, 'expiresAt' | 'provider'>,
  now = new Date(),
) {
  if (Date.parse(result.expiresAt) <= now.getTime()) {
    throw new MapProviderError(
      'STALE_RESULT',
      '계산 결과가 만료되었습니다. 다시 시도해주세요.',
      true,
      result.provider.traceId,
    )
  }
}

export function calculatePerPersonPreview(
  depositPointsTotal: number,
  targetParticipants: number,
) {
  if (
    !Number.isSafeInteger(depositPointsTotal) ||
    depositPointsTotal < 1 ||
    depositPointsTotal > MAX_AMOUNT ||
    !Number.isInteger(targetParticipants) ||
    targetParticipants < 2 ||
    targetParticipants > 4
  ) {
    throw new RangeError('예치 포인트와 목표 인원을 확인해주세요.')
  }
  return Math.ceil(depositPointsTotal / targetParticipants)
}
