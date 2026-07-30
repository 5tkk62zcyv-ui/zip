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

  it('blocks a remainder until a platform allocation policy is implemented', () => {
    expect(() => calculateDemoFinalShare(10_001, 3)).toThrow(
      'DEMO_SETTLEMENT_REMAINDER_UNSUPPORTED',
    )
  })
})
