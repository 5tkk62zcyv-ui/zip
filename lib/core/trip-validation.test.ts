import { describe, expect, it } from 'vitest'
import {
  createTripSchema,
  resolveTripClosureStatus,
} from './trip-validation'

const valid = {
  origin: '  전북대학교 정문  ',
  destination: '전주역',
  departureAt: '2099-01-01T12:00:00.000Z',
  maxParticipants: '3',
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
}

describe('createTripSchema', () => {
  it('normalizes a valid room creation request', () => {
    const result = createTripSchema.parse(valid)

    expect(result.origin).toBe('전북대학교 정문')
    expect(result.departureAt).toEqual(new Date(valid.departureAt))
    expect(result.maxParticipants).toBe(3)
  })

  it.each([2, 4])('accepts the %i-person boundary', (maxParticipants) => {
    expect(
      createTripSchema.safeParse({ ...valid, maxParticipants }).success,
    ).toBe(true)
  })

  it.each([
    ['one participant', { maxParticipants: 1 }],
    ['five participants', { maxParticipants: 5 }],
    ['fractional participants', { maxParticipants: 2.5 }],
    ['blank origin', { origin: ' ' }],
    ['blank destination', { destination: ' ' }],
    ['overlong origin', { origin: '가'.repeat(121) }],
    ['past departure', { departureAt: '2020-01-01T00:00:00.000Z' }],
    ['invalid departure', { departureAt: 'not-a-date' }],
    ['invalid idempotency key', { idempotencyKey: 'not-a-uuid' }],
  ])('rejects %s', (_name, patch) => {
    expect(createTripSchema.safeParse({ ...valid, ...patch }).success).toBe(
      false,
    )
  })
})

describe('resolveTripClosureStatus', () => {
  it.each([
    [1, 'EXPIRED'],
    [2, 'CLOSED'],
    [4, 'CLOSED'],
  ] as const)('maps %i confirmed participants to %s', (count, expected) => {
    expect(resolveTripClosureStatus(count)).toBe(expected)
  })

  it.each([0, 5, 2.5])('rejects an invalid confirmed count: %s', (count) => {
    expect(() => resolveTripClosureStatus(count)).toThrow(RangeError)
  })
})
