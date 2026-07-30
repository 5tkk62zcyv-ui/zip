import { describe, expect, it } from 'vitest'
import {
  MAX_POINT_AMOUNT,
  isPointRequestUuid,
  matchesGrantLedgerPayload,
  normalizePointReason,
  parsePointAmount,
} from './point-validation'

describe('point input validation', () => {
  it('accepts only positive bounded integer point amounts', () => {
    expect(parsePointAmount('1')).toBe(1)
    expect(parsePointAmount(MAX_POINT_AMOUNT)).toBe(MAX_POINT_AMOUNT)
    expect(parsePointAmount('0')).toBeNull()
    expect(parsePointAmount('1.5')).toBeNull()
    expect(parsePointAmount(MAX_POINT_AMOUNT + 1)).toBeNull()
  })

  it('requires a non-blank reason of at most 200 characters', () => {
    expect(normalizePointReason('  정산 부족분 요청  ')).toBe('정산 부족분 요청')
    expect(normalizePointReason('   ')).toBeNull()
    expect(normalizePointReason('가'.repeat(201))).toBeNull()
  })

  it('accepts only UUID request identifiers', () => {
    expect(isPointRequestUuid('8c03f23e-cce8-4adb-9d45-daa7c492f322')).toBe(
      true,
    )
    expect(isPointRequestUuid('not-a-uuid')).toBe(false)
  })
})

describe('grant idempotency payload matching', () => {
  const payload = {
    userId: 'user-1',
    availableDelta: 30000,
    heldDelta: 0,
    actorUserId: 'admin-1',
    reason: '운영 지급',
    pointRequestId: null,
  }

  it('accepts an exact retry', () => {
    expect(matchesGrantLedgerPayload(payload, { ...payload })).toBe(true)
  })

  it('rejects a reused key with a different payload', () => {
    expect(
      matchesGrantLedgerPayload(payload, {
        ...payload,
        availableDelta: 40000,
      }),
    ).toBe(false)
    expect(
      matchesGrantLedgerPayload(payload, {
        ...payload,
        userId: 'user-2',
      }),
    ).toBe(false)
  })
})
