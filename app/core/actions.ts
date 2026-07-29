'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin, requireCompleteUser } from '@/lib/auth/session'
import {
  CoreError,
  applyToTrip,
  approveParticipant,
  confirmFare,
  confirmTripAndDeposit,
  createTrip,
  grantPoints,
  settleTrip,
  submitActualFare,
} from '@/lib/core/service'

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

export async function createTripAction(formData: FormData) {
  const user = await requireCompleteUser()
  let tripId = ''
  try {
    tripId = await createTrip({
      actorId: user.userId,
      origin: text(formData, 'origin'),
      destination: text(formData, 'destination'),
      departureAt: new Date(text(formData, 'departureAt')),
      maxParticipants: Number(text(formData, 'maxParticipants')),
      estimatedFare: Number(text(formData, 'estimatedFare')),
      idempotencyKey: text(formData, 'idempotencyKey'),
    })
  } catch (error) {
    complete(error instanceof CoreError ? error.message : '방을 만들지 못했습니다.', true)
  }
  revalidatePath('/core')
  redirect(`/core?message=${encodeURIComponent('방을 만들었습니다.')}&trip=${tripId}`)
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

