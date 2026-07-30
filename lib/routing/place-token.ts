import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PlaceResult } from './types'

type PlaceTokenPayload = PlaceResult & {
  userId: string
  expiresAt: number
}

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.')
  }
  return value
}

export function issuePlaceSelectionToken(
  place: PlaceResult,
  userId: string,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({ ...place, userId, expiresAt: now + 30 * 60_000 }),
  ).toString('base64url')
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyPlaceSelectionToken(
  token: string,
  expected: PlaceResult,
  userId: string,
  now = Date.now(),
) {
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false
  const expectedSignature = createHmac('sha256', secret()).update(payload).digest()
  let actualSignature: Buffer
  try {
    actualSignature = Buffer.from(signature, 'base64url')
  } catch {
    return false
  }
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) return false
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as PlaceTokenPayload
    return (
      parsed.userId === userId &&
      parsed.expiresAt > now &&
      parsed.label === expected.label &&
      parsed.latitude === expected.latitude &&
      parsed.longitude === expected.longitude &&
      parsed.provider === expected.provider &&
      parsed.providerPlaceId === expected.providerPlaceId
    )
  } catch {
    return false
  }
}
