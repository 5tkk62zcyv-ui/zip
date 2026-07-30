import { describe, expect, it } from 'vitest'
import { calculateEndpointSimilarity } from './place-score'

describe('calculateEndpointSimilarity', () => {
  it('ranks identical endpoints highest', () => {
    expect(
      calculateEndpointSimilarity({
        originDistanceMeters: 0,
        destinationDistanceMeters: 0,
        candidateRouteDistanceMeters: 5000,
        maximumEndpointDistanceMeters: 300,
      }),
    ).toEqual({ routeSimilarityPercent: 100, score: 100 })
  })

  it('produces a lower deterministic score near the 300m boundary', () => {
    const result = calculateEndpointSimilarity({
      originDistanceMeters: 300,
      destinationDistanceMeters: 300,
      candidateRouteDistanceMeters: 5000,
      maximumEndpointDistanceMeters: 300,
    })
    expect(result.routeSimilarityPercent).toBe(88)
    expect(result.score).toBe(31)
  })
})
