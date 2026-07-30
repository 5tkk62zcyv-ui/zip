import type { GeoPoint } from '@/lib/maps/contracts'

export const RECOMMENDATION_POLICY = {
  key: 'same-destination-recommendation',
  version: '1',
  originRadiusMeters: 300,
  departureWindowMinutes: 15,
  evidenceTtlSeconds: 300,
  maximumResults: 5,
} as const

export type RecommendationSeed = {
  tripId: string
  seedLocationRevision: string
  origin: string
  destination: string
  originPoint: GeoPoint
  destinationPoint: GeoPoint
  destinationProvider: string
  destinationPlaceId: string
  departureAt: string
}

export type RecommendationCandidate = {
  tripId: string
  candidateLocationRevision: string
  hostUserId: string
  hostName: string
  origin: string
  destination: string
  originPoint: GeoPoint
  destinationPoint: GeoPoint
  destinationProvider: string
  destinationPlaceId: string
  departureAt: string
  maxParticipants: number
  approvedCount: number
  estimatedFare: number
  fareSource: string
  fareEstimateId: string
  fareLocationRevision: string
  fareCalculatedAt: string
  fareExpiresAt: string
  status: string
}

export type RankedRecommendation = RecommendationCandidate & {
  destinationClass: 'EXACT'
  originDistanceMeters: number
  destinationStraightDistanceMeters: 0
  destinationRouteDistanceMeters: 0
  estimatedDetourMinutes: 0
  departureDeltaSeconds: number
  departureDeltaMinutes: number
  remainingSeats: number
  expectedSharePoints: number
  calculatedAt: string
  evidenceExpiresAt: string
  policyKey: 'same-destination-recommendation'
  policyVersion: '1'
  calculationSource: 'DETERMINISTIC_EXACT_DESTINATION_V1'
  allowedDestinationRadiusMeters: 0
  isAdjacentDestination: false
  reasonTemplateKey: 'exact_destination'
  reasonTemplateVersion: '1'
  reasonData: {
    originDistanceMeters: number
    departureDeltaSeconds: number
    departureDeltaMinutes: number
    approvedCount: number
    maxParticipants: number
    remainingSeats: number
  }
  rank: number
  rankTuple: readonly [0, 0, 0, number, number, string, string]
  reason: string
}

const EARTH_RADIUS_METERS = 6_371_008.8

export function straightLineDistanceMeters(from: GeoPoint, to: GeoPoint) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return Math.round(
    2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine))),
  )
}

export function rankRecommendations(
  seed: RecommendationSeed,
  candidates: readonly RecommendationCandidate[],
  calculatedAt: string,
) {
  const calculatedAtMilliseconds = Date.parse(calculatedAt)
  const seedDepartureMilliseconds = Date.parse(seed.departureAt)
  if (
    !Number.isFinite(calculatedAtMilliseconds) ||
    !Number.isFinite(seedDepartureMilliseconds)
  ) {
    throw new RangeError('추천 산정 시각과 희망 출발 시각을 확인해주세요.')
  }

  return candidates
    .flatMap((candidate): RankedRecommendation[] => {
      const departureMilliseconds = Date.parse(candidate.departureAt)
      if (!Number.isFinite(departureMilliseconds)) return []

      const remainingSeats =
        candidate.maxParticipants - candidate.approvedCount
      const departureDeltaSeconds = Math.round(
        Math.abs(departureMilliseconds - seedDepartureMilliseconds) / 1_000,
      )
      const departureDeltaMinutes = Math.round(departureDeltaSeconds / 60)
      const originDistanceMeters = straightLineDistanceMeters(
        seed.originPoint,
        candidate.originPoint,
      )
      const hasExactDestinationIdentity =
        candidate.destinationProvider === seed.destinationProvider &&
        candidate.destinationPlaceId === seed.destinationPlaceId
      const fareCalculatedAtMilliseconds = Date.parse(
        candidate.fareCalculatedAt,
      )
      const fareExpiresAtMilliseconds = Date.parse(candidate.fareExpiresAt)
      const hasValidFareEvidence =
        candidate.candidateLocationRevision ===
          candidate.fareLocationRevision &&
        Number.isFinite(fareCalculatedAtMilliseconds) &&
        Number.isFinite(fareExpiresAtMilliseconds) &&
        fareCalculatedAtMilliseconds <= calculatedAtMilliseconds &&
        fareExpiresAtMilliseconds > calculatedAtMilliseconds &&
        Number.isSafeInteger(candidate.estimatedFare) &&
        candidate.estimatedFare >= 1 &&
        candidate.estimatedFare <= 1_000_000

      if (
        candidate.tripId === seed.tripId ||
        candidate.status !== 'OPEN' ||
        departureMilliseconds <= calculatedAtMilliseconds ||
        !hasExactDestinationIdentity ||
        !hasValidFareEvidence ||
        !Number.isInteger(candidate.maxParticipants) ||
        candidate.maxParticipants < 2 ||
        candidate.maxParticipants > 4 ||
        !Number.isInteger(candidate.approvedCount) ||
        candidate.approvedCount < 1 ||
        remainingSeats < 1 ||
        !Number.isFinite(originDistanceMeters) ||
        originDistanceMeters > RECOMMENDATION_POLICY.originRadiusMeters ||
        departureDeltaSeconds >
          RECOMMENDATION_POLICY.departureWindowMinutes * 60
      ) {
        return []
      }

      const evidenceExpiresAt = new Date(
        Math.min(
          fareExpiresAtMilliseconds,
          calculatedAtMilliseconds +
            RECOMMENDATION_POLICY.evidenceTtlSeconds * 1_000,
        ),
      ).toISOString()
      const reasonData = {
        originDistanceMeters,
        departureDeltaSeconds,
        departureDeltaMinutes,
        approvedCount: candidate.approvedCount,
        maxParticipants: candidate.maxParticipants,
        remainingSeats,
      }

      return [
        {
          ...candidate,
          destinationClass: 'EXACT',
          originDistanceMeters,
          destinationStraightDistanceMeters: 0,
          destinationRouteDistanceMeters: 0,
          estimatedDetourMinutes: 0,
          departureDeltaSeconds,
          departureDeltaMinutes,
          remainingSeats,
          expectedSharePoints: Math.ceil(
            candidate.estimatedFare / candidate.maxParticipants,
          ),
          calculatedAt: new Date(calculatedAtMilliseconds).toISOString(),
          evidenceExpiresAt,
          policyKey: RECOMMENDATION_POLICY.key,
          policyVersion: RECOMMENDATION_POLICY.version,
          calculationSource: 'DETERMINISTIC_EXACT_DESTINATION_V1',
          allowedDestinationRadiusMeters: 0,
          isAdjacentDestination: false,
          reasonTemplateKey: 'exact_destination',
          reasonTemplateVersion: '1',
          reasonData,
          rank: 0,
          rankTuple: [
            0,
            0,
            0,
            departureDeltaSeconds,
            originDistanceMeters,
            candidate.departureAt,
            candidate.tripId,
          ],
          reason: buildRecommendationReason(reasonData),
        },
      ]
    })
    .sort((left, right) => {
      const departureUrgencyDelta =
        Date.parse(left.departureAt) - Date.parse(right.departureAt)
      return (
        left.departureDeltaSeconds - right.departureDeltaSeconds ||
        left.originDistanceMeters - right.originDistanceMeters ||
        departureUrgencyDelta ||
        left.tripId.localeCompare(right.tripId)
      )
    })
    .slice(0, RECOMMENDATION_POLICY.maximumResults)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
    }))
}

function buildRecommendationReason(input: {
  originDistanceMeters: number
  departureDeltaSeconds: number
  departureDeltaMinutes: number
  approvedCount: number
  maxParticipants: number
  remainingSeats: number
}) {
  const originReason =
    input.originDistanceMeters === 0
      ? '출발지가 같은 위치이고'
      : `출발지가 ${input.originDistanceMeters.toLocaleString('ko-KR')}m 이내이고`
  const timeReason =
    input.departureDeltaMinutes === 0
      ? '희망 시각과 같은 시간에 출발하는'
      : `희망 시각과 ${input.departureDeltaMinutes}분 차이로 출발하는`

  return `같은 목적지로 이동하며 ${originReason} ${timeReason} ${input.approvedCount}/${input.maxParticipants}명 모집입니다.`
}
