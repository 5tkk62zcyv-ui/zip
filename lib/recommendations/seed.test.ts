import { describe, expect, it } from 'vitest'
import { parseRecommendationSeedParam } from './seed'

describe('recommendation seed parameter', () => {
  it('keeps an absent parameter distinct from an invalid explicit seed', () => {
    expect(parseRecommendationSeedParam(undefined)).toBeUndefined()
    expect(parseRecommendationSeedParam('not-a-trip')).toBeNull()
    expect(parseRecommendationSeedParam([])).toBeNull()
    expect(
      parseRecommendationSeedParam([
        '0198f654-7c21-7a42-8ce8-c14c249ea9a9',
      ]),
    ).toBeNull()
  })

  it('accepts one UUID and normalizes its case', () => {
    expect(
      parseRecommendationSeedParam(
        '0198F654-7C21-7A42-8CE8-C14C249EA9A9',
      ),
    ).toBe('0198f654-7c21-7a42-8ce8-c14c249ea9a9')
  })
})
