import { describe, expect, it } from 'vitest'
import {
  parsePlaceQuery,
  parseRouteEstimateRequest,
} from './validation'

describe('routing request validation', () => {
  it('normalizes a valid place query', () => {
    expect(parsePlaceQuery('  전북대학교  ')).toMatchObject({
      success: true,
      data: '전북대학교',
    })
  })

  it.each(['', ' ', '가'.repeat(101), null])(
    'rejects an invalid place query: %o',
    (query) => {
      expect(parsePlaceQuery(query).success).toBe(false)
    },
  )

  it('accepts WGS84 coordinate boundaries', () => {
    expect(
      parseRouteEstimateRequest({
        origin: { latitude: -90, longitude: -180 },
        destination: { latitude: 90, longitude: 180 },
      }).success,
    ).toBe(true)
  })

  it.each([
    { origin: { latitude: 91, longitude: 0 } },
    { origin: { latitude: 0, longitude: 181 } },
    { destination: { latitude: Number.NaN, longitude: 0 } },
    { destination: { latitude: '35', longitude: 127 } },
  ])('rejects invalid route coordinates: %o', (patch) => {
    const value = {
      origin: { latitude: 35.846, longitude: 127.129 },
      destination: { latitude: 35.8584, longitude: 127.1617 },
      ...patch,
    }
    expect(parseRouteEstimateRequest(value).success).toBe(false)
  })
})
