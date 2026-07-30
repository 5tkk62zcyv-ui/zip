import { describe, expect, it } from 'vitest'
import type { GeoPoint } from '@/lib/maps/contracts'
import {
  rankRecommendations,
  straightLineDistanceMeters,
  type RecommendationCandidate,
  type RecommendationSeed,
} from './rank'

const point = (latitude: number, longitude: number): GeoPoint => ({
  crs: 'EPSG:4326',
  latitude,
  longitude,
})

function pointNorthOfSeed(distanceMeters: number) {
  const earthRadiusMeters = 6_371_008.8
  return point(
    seed.originPoint.latitude +
      (distanceMeters / earthRadiusMeters) * (180 / Math.PI),
    seed.originPoint.longitude,
  )
}

const seed: RecommendationSeed = {
  tripId: 'seed',
  seedLocationRevision: 'seed-revision',
  origin: '전북대학교 정문',
  destination: '전주역',
  originPoint: point(35.8468, 127.1295),
  destinationPoint: point(35.8499, 127.1618),
  destinationProvider: 'kakao',
  destinationPlaceId: 'destination-1',
  departureAt: '2026-07-30T12:00:00.000Z',
}

function candidate(
  overrides: Partial<RecommendationCandidate> = {},
): RecommendationCandidate {
  return {
    tripId: 'candidate-a',
    candidateLocationRevision: 'revision-a',
    hostUserId: 'host-a',
    hostName: '홍길동',
    origin: '전북대학교 구정문',
    destination: '전주역',
    originPoint: point(35.8469, 127.1295),
    destinationPoint: point(35.8499, 127.1618),
    destinationProvider: 'kakao',
    destinationPlaceId: 'destination-1',
    departureAt: '2026-07-30T12:05:00.000Z',
    maxParticipants: 4,
    approvedCount: 2,
    estimatedFare: 12_000,
    fareSource: 'kakao:PROVIDER',
    fareEstimateId: 'fare-a',
    fareLocationRevision: 'revision-a',
    fareCalculatedAt: '2026-07-30T11:40:00.000Z',
    fareExpiresAt: '2026-07-30T12:40:00.000Z',
    status: 'OPEN',
    ...overrides,
  }
}

describe('deterministic trip recommendations', () => {
  it('calculates rounded WGS84 straight-line distance', () => {
    expect(straightLineDistanceMeters(seed.originPoint, seed.originPoint)).toBe(0)
    expect(
      straightLineDistanceMeters(
        point(37.5665, 126.978),
        point(35.1796, 129.0756),
      ),
    ).toBeGreaterThan(320_000)
  })

  it('emits traceable exact-destination evidence and deterministic reason', () => {
    const [result] = rankRecommendations(
      seed,
      [candidate()],
      '2026-07-30T11:45:00.000Z',
    )

    expect(result).toMatchObject({
      tripId: 'candidate-a',
      destinationStraightDistanceMeters: 0,
      destinationRouteDistanceMeters: 0,
      estimatedDetourMinutes: 0,
      departureDeltaSeconds: 300,
      departureDeltaMinutes: 5,
      remainingSeats: 2,
      expectedSharePoints: 3_000,
      policyKey: 'same-destination-recommendation',
      policyVersion: '1',
      calculationSource: 'DETERMINISTIC_EXACT_DESTINATION_V1',
      allowedDestinationRadiusMeters: 0,
      isAdjacentDestination: false,
      reasonTemplateKey: 'exact_destination',
      reasonTemplateVersion: '1',
      rank: 1,
      calculatedAt: '2026-07-30T11:45:00.000Z',
    })
    expect(result.reason).toContain('같은 목적지')
    expect(result.reason).toContain('희망 시각과 5분 차이')
    expect(result.reason).toContain('2/4명')
  })

  it.each([
    ['different provider', { destinationProvider: 'naver' }],
    ['different place identity', { destinationPlaceId: 'destination-2' }],
    ['outside time window', { departureAt: '2026-07-30T12:16:00.000Z' }],
    ['full room', { approvedCount: 4 }],
    ['closed room', { status: 'CLOSED' }],
    ['past departure', { departureAt: '2026-07-30T11:44:59.000Z' }],
    ['source room itself', { tripId: 'seed' }],
    ['stale fare', { fareExpiresAt: '2026-07-30T11:45:00.000Z' }],
    ['location revision mismatch', { fareLocationRevision: 'old-revision' }],
    [
      'outside origin radius',
      { originPoint: point(35.8508, 127.1295) },
    ],
  ])('excludes %s without inventing adjacent-route evidence', (_, overrides) => {
    expect(
      rankRecommendations(
        seed,
        [candidate(overrides as Partial<RecommendationCandidate>)],
        '2026-07-30T11:45:00.000Z',
      ),
    ).toEqual([])
  })

  it('sorts by time difference, origin distance, urgency, then trip id', () => {
    const results = rankRecommendations(
      seed,
      [
        candidate({
          tripId: 'time-later',
          departureAt: '2026-07-30T12:10:00.000Z',
        }),
        candidate({
          tripId: 'origin-farther',
          originPoint: point(35.8472, 127.1295),
        }),
        candidate({
          tripId: 'b',
          departureAt: '2026-07-30T11:55:00.000Z',
        }),
        candidate({
          tripId: 'a',
          departureAt: '2026-07-30T11:55:00.000Z',
        }),
      ],
      '2026-07-30T11:45:00.000Z',
    )

    expect(results.map((result) => result.tripId)).toEqual([
      'a',
      'b',
      'origin-farther',
      'time-later',
    ])
  })

  it('keeps normalized ranking stable when the place provider is switched', () => {
    const kakaoResults = rankRecommendations(
      seed,
      [candidate({ tripId: 'b' }), candidate({ tripId: 'a' })],
      '2026-07-30T11:45:00.000Z',
    )
    const naverSeed = { ...seed, destinationProvider: 'naver' }
    const naverResults = rankRecommendations(
      naverSeed,
      [
        candidate({ tripId: 'b', destinationProvider: 'naver' }),
        candidate({ tripId: 'a', destinationProvider: 'naver' }),
      ],
      '2026-07-30T11:45:00.000Z',
    )

    expect(
      naverResults.map(
        ({ tripId, rank, originDistanceMeters, departureDeltaSeconds }) => ({
          tripId,
          rank,
          originDistanceMeters,
          departureDeltaSeconds,
        }),
      ),
    ).toEqual(
      kakaoResults.map(
        ({ tripId, rank, originDistanceMeters, departureDeltaSeconds }) => ({
          tripId,
          rank,
          originDistanceMeters,
          departureDeltaSeconds,
        }),
      ),
    )
  })

  it('includes the 300m/900s boundaries and excludes each +1 boundary', () => {
    expect(
      straightLineDistanceMeters(seed.originPoint, pointNorthOfSeed(300)),
    ).toBe(300)
    expect(
      straightLineDistanceMeters(seed.originPoint, pointNorthOfSeed(301)),
    ).toBe(301)

    const included = rankRecommendations(
      seed,
      [
        candidate({
          tripId: 'boundary',
          originPoint: pointNorthOfSeed(300),
          departureAt: '2026-07-30T12:15:00.000Z',
        }),
      ],
      '2026-07-30T11:45:00.000Z',
    )
    const tooFar = rankRecommendations(
      seed,
      [candidate({ originPoint: pointNorthOfSeed(301) })],
      '2026-07-30T11:45:00.000Z',
    )
    const tooLate = rankRecommendations(
      seed,
      [candidate({ departureAt: '2026-07-30T12:15:01.000Z' })],
      '2026-07-30T11:45:00.000Z',
    )

    expect(included).toHaveLength(1)
    expect(included[0].departureDeltaSeconds).toBe(900)
    expect(tooFar).toEqual([])
    expect(tooLate).toEqual([])
  })

  it('rejects invalid calculation instants', () => {
    expect(() => rankRecommendations(seed, [candidate()], 'not-a-date')).toThrow(
      '추천 산정 시각',
    )
  })
})
