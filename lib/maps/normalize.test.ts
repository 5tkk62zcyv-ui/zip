import { describe, expect, it } from 'vitest'
import {
  assertFreshResult,
  calculatePerPersonPreview,
  normalizeFareResult,
  normalizeGeoPoint,
  normalizeProviderEvidence,
  normalizeRouteResult,
} from './normalize'

const provider = normalizeProviderEvidence({
  providerKey: 'fixture',
  requestId: 'request-1',
  traceId: 'trace-1',
})

describe('provider-neutral map normalization', () => {
  it('normalizes a WGS84 point', () => {
    expect(
      normalizeGeoPoint({ latitude: 35.8468, longitude: 127.1295 }, 'trace'),
    ).toEqual({
      crs: 'EPSG:4326',
      latitude: 35.8468,
      longitude: 127.1295,
    })
  })

  it.each([
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: 181 },
    { latitude: Number.NaN, longitude: 0 },
    { latitude: 0, longitude: Number.POSITIVE_INFINITY },
  ])('rejects an invalid point: %o', (point) => {
    expect(() => normalizeGeoPoint(point, 'trace')).toThrowError(
      expect.objectContaining({ code: 'MALFORMED_RESPONSE' }),
    )
  })

  it('keeps route units as integer meters and seconds', () => {
    expect(
      normalizeRouteResult({
        calculationId: 'route-1',
        distanceMeters: 0,
        durationSeconds: 0,
        calculatedAt: '2026-07-30T00:00:00.000Z',
        expiresAt: '2026-07-30T00:05:00.000Z',
        provider,
      }),
    ).toMatchObject({ distanceMeters: 0, durationSeconds: 0 })
  })

  it.each([
    { distanceMeters: 1.5, durationSeconds: 1 },
    { distanceMeters: -1, durationSeconds: 1 },
    { distanceMeters: 1, durationSeconds: Number.NaN },
  ])('rejects malformed route units: %o', (patch) => {
    expect(() =>
      normalizeRouteResult({
        calculationId: 'route-1',
        calculatedAt: '2026-07-30T00:00:00.000Z',
        expiresAt: '2026-07-30T00:05:00.000Z',
        provider,
        ...patch,
      }),
    ).toThrowError(expect.objectContaining({ code: 'MALFORMED_RESPONSE' }))
  })

  it('normalizes fare evidence without mixing won and points', () => {
    expect(
      normalizeFareResult({
        calculationId: 'fare-1',
        estimatedFareWon: 10001,
        depositPointsTotal: 10001,
        calculatedAt: '2026-07-30T00:00:00.000Z',
        expiresAt: '2026-07-30T00:05:00.000Z',
        policyKey: 'fixture-policy',
        policyVersion: '1',
        source: 'POLICY',
        provider,
        calculationBasis: { routeCalculationId: 'route-1' },
      }),
    ).toMatchObject({
      estimatedFareWon: 10001,
      depositPointsTotal: 10001,
    })
  })

  it('rejects stale results', () => {
    expect(() =>
      assertFreshResult(
        {
          expiresAt: '2026-07-30T00:05:00.000Z',
          provider,
        },
        new Date('2026-07-30T00:05:00.000Z'),
      ),
    ).toThrowError(expect.objectContaining({ code: 'STALE_RESULT' }))
  })
})

describe('per-person preview', () => {
  it.each([
    [10001, 2, 5001],
    [10001, 4, 2501],
    [12000, 3, 4000],
  ])('calculates ceil(%i / %i) as %i', (total, participants, expected) => {
    expect(calculatePerPersonPreview(total, participants)).toBe(expected)
  })

  it.each([
    [0, 2],
    [1000, 1],
    [1000, 5],
  ])('rejects invalid inputs: %i points, %i people', (total, participants) => {
    expect(() => calculatePerPersonPreview(total, participants)).toThrow(
      RangeError,
    )
  })
})
