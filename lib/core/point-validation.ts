export const MAX_POINT_AMOUNT = 1_000_000
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type GrantLedgerPayload = {
  userId: string
  availableDelta: number
  heldDelta: number
  actorUserId: string
  reason: string
  pointRequestId: string | null
}

export function parsePointAmount(value: unknown) {
  const amount =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value)
        : Number.NaN

  return Number.isSafeInteger(amount) &&
    amount >= 1 &&
    amount <= MAX_POINT_AMOUNT
    ? amount
    : null
}

export function normalizePointReason(value: unknown) {
  if (typeof value !== 'string') return null
  const reason = value.trim()
  return reason && reason.length <= 200 ? reason : null
}

export function isPointRequestUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function matchesGrantLedgerPayload(
  row: GrantLedgerPayload,
  input: GrantLedgerPayload,
) {
  return (
    row.userId === input.userId &&
    row.availableDelta === input.availableDelta &&
    row.heldDelta === input.heldDelta &&
    row.actorUserId === input.actorUserId &&
    row.reason === input.reason &&
    row.pointRequestId === input.pointRequestId
  )
}
