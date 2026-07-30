import { z } from 'zod'

export const placeQuerySchema = z.string().trim().min(1).max(100)

export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
})

export const routeEstimateRequestSchema = z.object({
  origin: coordinatesSchema,
  destination: coordinatesSchema,
})

export function parsePlaceQuery(value: unknown) {
  return placeQuerySchema.safeParse(value)
}

export function parseRouteEstimateRequest(value: unknown) {
  return routeEstimateRequestSchema.safeParse(value)
}
