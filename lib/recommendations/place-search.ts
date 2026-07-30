import 'server-only'

import { randomUUID } from 'node:crypto'
import { ensureDatabaseIdentity, getDatabase } from '@/lib/db/client'
import { straightLineDistanceMeters } from './rank'
import { calculateEndpointSimilarity } from './place-score'
import type {
  PlaceResult,
  SelectablePlaceResult,
} from '@/lib/routing/types'
import { verifyPlaceSelectionToken } from '@/lib/routing/place-token'

const MAX_ENDPOINT_DISTANCE_METERS = 300

export type PlaceRecommendation = {
  tripId: string
  hostName: string
  origin: string
  destination: string
  departureAt: string
  maxParticipants: number
  approvedCount: number
  estimatedFare: number
  expectedSharePoints: number
  estimatedSavingsPoints: number | null
  fareIsFresh: boolean
  originDistanceMeters: number
  destinationDistanceMeters: number
  routeSimilarityPercent: number
  score: number
  reason: string
}

type CandidateRow = {
  tripId: string
  hostName: string
  origin: string
  destination: string
  originLatitude: string
  originLongitude: string
  destinationLatitude: string
  destinationLongitude: string
  departureAt: string
  maxParticipants: number
  approvedCount: number
  estimatedFare: number
  routeDistanceMeters: number
  fareExpiresAt: string
}

export async function searchOpenTripRecommendations(input: {
  userId: string
  origin: SelectablePlaceResult
  destination: SelectablePlaceResult
}) {
  verifySelectedPlace(input.origin, input.userId)
  verifySelectedPlace(input.destination, input.userId)
  await ensureDatabaseIdentity()
  const sql = getDatabase()
  const rows = await sql`
    SELECT
      g.trip_id AS "tripId",
      host.name AS "hostName",
      g.origin,
      g.destination,
      g.origin_latitude AS "originLatitude",
      g.origin_longitude AS "originLongitude",
      g.destination_latitude AS "destinationLatitude",
      g.destination_longitude AS "destinationLongitude",
      g.departure_at AS "departureAt",
      g.max_participants AS "maxParticipants",
      confirmed.count AS "approvedCount",
      f.deposit_points_total AS "estimatedFare",
      f.route_distance_m AS "routeDistanceMeters",
      f.expires_at AS "fareExpiresAt"
    FROM trip_groups g
    JOIN users host ON host.user_id = g.host_user_id
    JOIN fare_estimates f
      ON f.trip_id = g.trip_id
     AND f.fare_estimate_id = g.current_fare_estimate_id
     AND f.trip_location_revision = g.location_revision
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS count
      FROM trip_participants p
      WHERE p.trip_id = g.trip_id
        AND p.status IN (
          'APPROVED', 'DEPOSITED', 'CHECKED_IN',
          'NO_SHOW', 'DISPUTED', 'COMPLETED'
        )
    ) confirmed
    WHERE g.status = 'OPEN'
      AND g.departure_at > now()
      AND g.host_user_id <> ${input.userId}
      AND host.account_status = 'ACTIVE'
      AND confirmed.count < g.max_participants
      AND g.origin_latitude IS NOT NULL
      AND g.origin_longitude IS NOT NULL
      AND g.destination_latitude IS NOT NULL
      AND g.destination_longitude IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM trip_participants mine
        WHERE mine.trip_id = g.trip_id
          AND mine.user_id = ${input.userId}
      )
    ORDER BY g.departure_at, g.trip_id
    LIMIT 50
  `

  const calculatedAt = new Date().toISOString()
  const recommendations = (rows as unknown as CandidateRow[])
    .flatMap((row): PlaceRecommendation[] => {
      const originDistanceMeters = straightLineDistanceMeters(
        toPoint(input.origin),
        {
          crs: 'EPSG:4326',
          latitude: Number(row.originLatitude),
          longitude: Number(row.originLongitude),
        },
      )
      const destinationDistanceMeters = straightLineDistanceMeters(
        toPoint(input.destination),
        {
          crs: 'EPSG:4326',
          latitude: Number(row.destinationLatitude),
          longitude: Number(row.destinationLongitude),
        },
      )
      if (
        originDistanceMeters > MAX_ENDPOINT_DISTANCE_METERS ||
        destinationDistanceMeters > MAX_ENDPOINT_DISTANCE_METERS
      ) {
        return []
      }
      const { routeSimilarityPercent, score } = calculateEndpointSimilarity({
        originDistanceMeters,
        destinationDistanceMeters,
        candidateRouteDistanceMeters: Number(row.routeDistanceMeters),
        maximumEndpointDistanceMeters: MAX_ENDPOINT_DISTANCE_METERS,
      })
      const maxParticipants = Number(row.maxParticipants)
      const estimatedFare = Number(row.estimatedFare)
      const fareIsFresh = Date.parse(row.fareExpiresAt) > Date.now()
      const expectedSharePoints = Math.ceil(
        estimatedFare / maxParticipants,
      )
      const destinationReason =
        destinationDistanceMeters === 0
          ? '목적지가 동일합니다.'
          : `목적지가 ${destinationDistanceMeters.toLocaleString('ko-KR')}m 거리입니다.`

      return [
        {
          tripId: row.tripId,
          hostName: row.hostName,
          origin: row.origin,
          destination: row.destination,
          departureAt: row.departureAt,
          maxParticipants,
          approvedCount: Number(row.approvedCount),
          estimatedFare,
          expectedSharePoints,
          estimatedSavingsPoints: fareIsFresh
            ? Math.max(0, estimatedFare - expectedSharePoints)
            : null,
          fareIsFresh,
          originDistanceMeters,
          destinationDistanceMeters,
          routeSimilarityPercent,
          score,
          reason: `출발지가 ${originDistanceMeters.toLocaleString('ko-KR')}m 거리이고 ${destinationReason} 출발·도착 근접도 기준 경로 유사도는 ${routeSimilarityPercent}%입니다.`,
        },
      ]
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.originDistanceMeters - right.originDistanceMeters ||
        left.destinationDistanceMeters - right.destinationDistanceMeters ||
        Date.parse(left.departureAt) - Date.parse(right.departureAt) ||
        left.tripId.localeCompare(right.tripId),
    )
    .slice(0, 5)

  const requestId = randomUUID()
  console.info('Place recommendation calculated.', {
    requestId,
    userId: input.userId,
    calculatedAt,
    candidateTripIds: recommendations.map((item) => item.tripId),
  })
  return { requestId, calculatedAt, recommendations }
}

function verifySelectedPlace(
  place: SelectablePlaceResult,
  userId: string,
) {
  const expected: PlaceResult = {
    label: place.label,
    latitude: place.latitude,
    longitude: place.longitude,
    provider: place.provider,
    providerPlaceId: place.providerPlaceId,
  }
  if (
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude) ||
    !verifyPlaceSelectionToken(place.selectionToken, expected, userId)
  ) {
    throw new Error('INVALID_PLACE_SELECTION')
  }
}

function toPoint(place: SelectablePlaceResult) {
  return {
    crs: 'EPSG:4326' as const,
    latitude: place.latitude,
    longitude: place.longitude,
  }
}
