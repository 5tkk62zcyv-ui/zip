export function calculateEndpointSimilarity(input: {
  originDistanceMeters: number
  destinationDistanceMeters: number
  candidateRouteDistanceMeters: number
  maximumEndpointDistanceMeters: number
}) {
  const routeDistance = Math.max(input.candidateRouteDistanceMeters, 1)
  const routeSimilarityPercent = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          ((input.originDistanceMeters + input.destinationDistanceMeters) /
            routeDistance) *
            100,
      ),
    ),
  )
  const proximityScore =
    100 -
    ((input.originDistanceMeters + input.destinationDistanceMeters) /
      (input.maximumEndpointDistanceMeters * 2)) *
      100
  return {
    routeSimilarityPercent,
    score: Math.round(
      Math.max(
        0,
        Math.min(100, proximityScore * 0.65 + routeSimilarityPercent * 0.35),
      ),
    ),
  }
}
