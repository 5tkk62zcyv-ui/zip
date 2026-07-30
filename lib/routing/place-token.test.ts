import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  issuePlaceSelectionToken,
  verifyPlaceSelectionToken,
} from './place-token'

const originalSecret = process.env.SESSION_SECRET
const place = {
  label: '전북대학교',
  latitude: 35.846,
  longitude: 127.129,
  provider: 'kakao' as const,
  providerPlaceId: 'place-1',
}

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret-with-at-least-thirty-two-characters'
})
afterEach(() => {
  process.env.SESSION_SECRET = originalSecret
})

describe('place selection token', () => {
  it('binds the selected place and user', () => {
    const token = issuePlaceSelectionToken(place, 'user-1', 1_000)
    expect(verifyPlaceSelectionToken(token, place, 'user-1', 2_000)).toBe(true)
    expect(
      verifyPlaceSelectionToken(
        token,
        { ...place, latitude: 36 },
        'user-1',
        2_000,
      ),
    ).toBe(false)
    expect(verifyPlaceSelectionToken(token, place, 'user-2', 2_000)).toBe(false)
  })

  it('rejects expired and tampered tokens', () => {
    const token = issuePlaceSelectionToken(place, 'user-1', 1_000)
    expect(
      verifyPlaceSelectionToken(token, place, 'user-1', 31 * 60_000),
    ).toBe(false)
    expect(
      verifyPlaceSelectionToken(`${token}x`, place, 'user-1', 2_000),
    ).toBe(false)
  })
})
