import { z } from 'zod'

const departureAtSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim()
      ? new Date(value)
      : value,
  z.date({ error: '출발 시각을 입력해주세요.' }),
)

export const createTripSchema = z.object({
  origin: z
    .string()
    .trim()
    .min(1, '출발지를 입력해주세요.')
    .max(120, '출발지는 120자 이하여야 합니다.'),
  destination: z
    .string()
    .trim()
    .min(1, '도착지를 입력해주세요.')
    .max(120, '도착지는 120자 이하여야 합니다.'),
  departureAt: departureAtSchema.refine(
    (value) => value.getTime() > Date.now(),
    '출발 시각은 현재 이후여야 합니다.',
  ),
  maxParticipants: z.coerce
    .number()
    .int('최대 인원은 정수여야 합니다.')
    .min(2, '최대 인원은 2~4명이어야 합니다.')
    .max(4, '최대 인원은 2~4명이어야 합니다.'),
  idempotencyKey: z.uuid('요청 식별자가 올바르지 않습니다.'),
})

export type CreateTripInput = z.infer<typeof createTripSchema>

export function parseCreateTripForm(formData: FormData) {
  return createTripSchema.safeParse({
    origin: formData.get('origin'),
    destination: formData.get('destination'),
    departureAt: formData.get('departureAt'),
    maxParticipants: formData.get('maxParticipants'),
    idempotencyKey: formData.get('idempotencyKey'),
  })
}

export function resolveTripClosureStatus(confirmedParticipants: number) {
  if (
    !Number.isInteger(confirmedParticipants) ||
    confirmedParticipants < 1 ||
    confirmedParticipants > 4
  ) {
    throw new RangeError('확정 인원은 방장을 포함해 1~4명이어야 합니다.')
  }
  return confirmedParticipants >= 2 ? 'CLOSED' : 'EXPIRED'
}
