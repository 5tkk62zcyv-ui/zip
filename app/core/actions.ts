'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin, requireCompleteUser } from '@/lib/auth/session'
import { parseCreateTripForm } from '@/lib/core/trip-validation'
import {
  CoreError,
  applyToTrip,
  approveParticipant,
  cancelTrip,
  closeTrip,
  confirmFare,
  confirmTripAndDeposit,
  createTrip,
  grantPoints,
  settleTrip,
  submitActualFare,
} from '@/lib/core/service'

export type CreateTripState = {
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
}

function text(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function complete(message: string, error = false): never {
  revalidatePath('/core')
  redirect(`/core?${error ? 'error' : 'message'}=${encodeURIComponent(message)}`)
}

async function execute(run: () => Promise<void>, success: string) {
  try {
    await run()
  } catch (error) {
    complete(
      error instanceof CoreError ? error.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
      true,
    )
  }
  complete(success)
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function completeRoom(tripId: string, message: string, error = false): never {
  revalidatePath('/home')
  revalidatePath('/my-rooms')
  revalidatePath(`/room/${tripId}`)
  redirect(
    `/room/${tripId}?${error ? 'error' : 'message'}=${encodeURIComponent(message)}`,
  )
}

async function executeRoom(
  tripId: string,
  run: () => Promise<void>,
  success: string,
) {
  try {
    await run()
  } catch (error) {
    completeRoom(
      tripId,
      error instanceof CoreError
        ? error.message
        : '요청을 처리하지 못했습니다. 새로고침한 뒤 다시 시도해 주세요.',
      true,
    )
  }
  completeRoom(tripId, success)
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value)
}

export async function createTripAction(formData: FormData) {
  const user = await requireCompleteUser()
  const parsed = parseCreateTripForm(formData)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? '입력값을 다시 확인해주세요.'
    complete(message, true)
  }

  let tripId = ''
  try {
    tripId = await createTrip({
      actorId: user.userId,
      ...parsed.data,
    })
  } catch (error) {
    complete(error instanceof CoreError ? error.message : '방을 만들지 못했습니다.', true)
  }
  revalidatePath('/core')
  redirect(`/core?message=${encodeURIComponent('방을 만들었습니다.')}&trip=${tripId}`)
}

export async function createRoomAction(
  _previousState: CreateTripState,
  formData: FormData,
): Promise<CreateTripState> {
  const user = await requireCompleteUser()
  const parsed = parseCreateTripForm(formData)

  if (!parsed.success) {
    return {
      message: '입력한 방 정보를 다시 확인해주세요.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  let tripId: string
  try {
    tripId = await createTrip({
      actorId: user.userId,
      ...parsed.data,
    })
  } catch (error) {
    if (!(error instanceof CoreError)) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String(error.code)
          : ''
      console.error('Trip creation failed without exposing submitted locations.', {
        code,
      })
    }
    return {
      message:
        error instanceof CoreError
          ? error.message
          : '방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  revalidatePath('/core')
  revalidatePath('/home')
  revalidatePath('/my-rooms')
  redirect(
    `/core?message=${encodeURIComponent('방을 만들었습니다.')}&trip=${tripId}`,
  )
}

export async function applyAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () => applyToTrip(user.userId, text(formData, 'tripId'), text(formData, 'idempotencyKey')),
    '참여를 신청했습니다.',
  )
}

export async function approveAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () =>
      approveParticipant({
        actorId: user.userId,
        tripId: text(formData, 'tripId'),
        participantId: text(formData, 'participantId'),
        idempotencyKey: text(formData, 'idempotencyKey'),
      }),
    '참여를 승인했습니다.',
  )
}

export async function applyFromRoomAction(formData: FormData) {
  const user = await requireCompleteUser()
  const tripId = text(formData, 'tripId')
  const idempotencyKey = text(formData, 'idempotencyKey')

  if (!isUuid(tripId)) {
    redirect(`/home?error=${encodeURIComponent('올바르지 않은 방 식별자입니다.')}`)
  }
  if (!isUuid(idempotencyKey)) {
    completeRoom(tripId, '요청 식별자가 올바르지 않습니다.', true)
  }

  await executeRoom(
    tripId,
    () => applyToTrip(user.userId, tripId, idempotencyKey),
    '참여 신청을 보냈습니다. 방장의 승인을 기다려 주세요.',
  )
}

export async function approveFromRoomAction(formData: FormData) {
  const user = await requireCompleteUser()
  const tripId = text(formData, 'tripId')
  const participantId = text(formData, 'participantId')
  const idempotencyKey = text(formData, 'idempotencyKey')

  if (!isUuid(tripId)) {
    redirect(`/home?error=${encodeURIComponent('올바르지 않은 방 식별자입니다.')}`)
  }
  if (!isUuid(participantId) || !isUuid(idempotencyKey)) {
    completeRoom(tripId, '승인 요청 정보가 올바르지 않습니다.', true)
  }

  await executeRoom(
    tripId,
    () =>
      approveParticipant({
        actorId: user.userId,
        tripId,
        participantId,
        idempotencyKey,
      }),
    '참여 신청을 승인했습니다.',
  )
}

export async function closeTripAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () =>
      closeTrip(
        user.userId,
        text(formData, 'tripId'),
        text(formData, 'idempotencyKey'),
      ),
    '모집을 종료했습니다.',
  )
}

export async function cancelTripAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () =>
      cancelTrip(
        user.userId,
        text(formData, 'tripId'),
        text(formData, 'idempotencyKey'),
      ),
    '모집을 취소했습니다.',
  )
}

export async function depositAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () => confirmTripAndDeposit(user.userId, text(formData, 'tripId'), text(formData, 'idempotencyKey')),
    '모집 확정과 예치를 완료했습니다.',
  )
}

export async function grantAction(formData: FormData) {
  const admin = await requireAdmin()
  await execute(
    () =>
      grantPoints({
        adminId: admin.userId,
        targetUserId: text(formData, 'targetUserId'),
        amount: Number(text(formData, 'amount')),
        reason: text(formData, 'reason'),
        idempotencyKey: text(formData, 'idempotencyKey'),
      }),
    '포인트를 지급했습니다.',
  )
}

export async function submitFareAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () =>
      submitActualFare({
        actorId: user.userId,
        tripId: text(formData, 'tripId'),
        actualFare: Number(text(formData, 'actualFare')),
        idempotencyKey: text(formData, 'idempotencyKey'),
      }),
    '실제 요금을 등록하고 확인했습니다.',
  )
}

export async function confirmFareAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () => confirmFare(user.userId, text(formData, 'tripId'), text(formData, 'idempotencyKey')),
    '실제 요금을 확인했습니다.',
  )
}

export async function settleAction(formData: FormData) {
  const user = await requireCompleteUser()
  await execute(
    () => settleTrip(user.userId, text(formData, 'tripId'), text(formData, 'idempotencyKey')),
    '최종 정산을 완료했습니다.',
  )
}

