const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function parseRecommendationSeedParam(
  value: string | string[] | undefined,
) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) return null
  return value.toLowerCase()
}
