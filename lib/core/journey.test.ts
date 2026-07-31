import { describe, expect, it } from 'vitest'
import { calculateDemoFinalShare } from './journey'

describe('calculateDemoFinalShare', () => {
  it('keeps a no-show in the escrow cohort denominator', () => {
    const statuses = ['CHECKED_IN', 'CHECKED_IN', 'NO_SHOW']
    expect(calculateDemoFinalShare(15_000, statuses.length)).toBe(5_000)
  })

  it.each([
    [10_000, 2, 5_000],
    [20_000, 4, 5_000],
  ])('calculates %i points across %i participants', (fare, count, share) => {
    expect(calculateDemoFinalShare(fare, count)).toBe(share)
  })

  it('rounds a remainder up to the next point', () => {
    expect(calculateDemoFinalShare(13_001, 4)).toBe(3_251)
  })
})
