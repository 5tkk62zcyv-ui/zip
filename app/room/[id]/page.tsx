import { randomUUID } from 'node:crypto'
import { notFound } from 'next/navigation'
import { Clock, MapPin, ShieldCheck, UsersRound } from 'lucide-react'
import {
  approveFromRoomAction,
  applyFromRoomAction,
} from '@/app/core/actions'
import { Avatar } from '@/components/avatar'
import { BottomBar } from '@/components/bottom-bar'
import {
  estimatedShareLabel,
  formatDeparture,
  maskName,
  participantStatusLabel,
  roomStatusLabel,
} from '@/components/database-room-card'
import { MobileShell } from '@/components/mobile-shell'
import { PendingSubmitButton } from '@/components/pending-submit-button'
import { StatusBadge } from '@/components/status-badge'
import { TopBar } from '@/components/top-bar'
import { Card, CardTitle } from '@/components/ui/card'
import { requireCompleteUser } from '@/lib/auth/session'
import { getCoreDashboard } from '@/lib/core/service'

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const user = await requireCompleteUser()
  const [{ id }, query] = await Promise.all([params, searchParams])
  const data = await getCoreDashboard(user.userId, user.role === 'ADMIN')
  const room = data.trips.find((item) => item.tripId === id)

  if (!room) notFound()

  const isHost = room.hostUserId === user.userId
  const departureOpen = new Date(room.departureAt) > new Date()
  const isAtCapacity = room.approvedCount >= room.maxParticipants
  const canApply =
    !isHost &&
    room.status === 'OPEN' &&
    departureOpen &&
    !isAtCapacity &&
    room.currentUserStatus === null
  const roomParticipants = data.participants.filter(
    (participant) => participant.tripId === room.tripId,
  )
  const applicants = isHost
    ? roomParticipants.filter((participant) => participant.status === 'APPLIED')
    : []
  const confirmedParticipants = roomParticipants.filter(
    (participant) => participant.status !== 'APPLIED',
  )
  const canApprove =
    isHost && room.status === 'OPEN' && departureOpen && !isAtCapacity

  return (
    <MobileShell withTabBar={false}>
      <TopBar title="동승 방 상세" subtitle={`방장 ${maskName(room.hostName)}`} />

      <main className="flex flex-1 flex-col gap-4 px-5 py-4 pb-28">
        {query.message ? (
          <p className="rounded-xl bg-mint-soft px-4 py-3 text-sm" role="status">
            {query.message}
          </p>
        ) : null}
        {query.error ? (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm" role="alert">
            {query.error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={room.status === 'OPEN' ? 'mint' : 'muted'}>
            {roomStatusLabel(room.status)}
          </StatusBadge>
          <StatusBadge tone={isAtCapacity ? 'muted' : 'brand'} icon={UsersRound}>
            확정 {room.approvedCount}/{room.maxParticipants}명
          </StatusBadge>
          {room.approvedCount >= 2 ? (
            <StatusBadge tone="info" icon={ShieldCheck}>
              최소 출발 인원 충족
            </StatusBadge>
          ) : (
            <StatusBadge tone="warn">출발까지 {2 - room.approvedCount}명 필요</StatusBadge>
          )}
        </div>

        <Card className="gap-3">
          <CardTitle>이동 정보</CardTitle>
          <InfoLine icon={MapPin} label="출발" value={room.origin} />
          <InfoLine icon={MapPin} label="도착" value={room.destination} />
          <InfoLine
            icon={Clock}
            label="출발 시각"
            value={formatDeparture(room.departureAt)}
          />
        </Card>

        <Card className="gap-3">
          <CardTitle>예상 분담금</CardTitle>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">예상 총요금</dt>
              <dd className="font-semibold">
                {room.estimatedFare === null
                  ? '산정 전'
                  : `${room.estimatedFare.toLocaleString('ko-KR')}P`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">예상 1인 분담금</dt>
              <dd className="text-base font-extrabold">
                {estimatedShareLabel(room)}
              </dd>
            </div>
          </dl>
          {room.estimatedFare === null ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              지도 기반 요금 산정이 완료되기 전에는 예상 금액이나 예치를 안내하지
              않습니다.
            </p>
          ) : (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              현재 확정 인원 기준 예상치이며, 실제 정산 금액과 다를 수 있습니다.
            </p>
          )}
        </Card>

        {isHost ? (
          <Card className="gap-3">
            <CardTitle>참여 신청 관리</CardTitle>
            <p className="text-xs text-muted-foreground">
              이번 모집은 방장이 신청을 직접 승인합니다. 자동 승인은 하지 않습니다.
            </p>
            {applicants.length > 0 ? (
              <div className="flex flex-col gap-2">
                {applicants.map((applicant, index) => (
                  <form
                    key={applicant.userId}
                    action={approveFromRoomAction}
                    className="rounded-xl border border-border p-3"
                  >
                    <input type="hidden" name="tripId" value={room.tripId} />
                    <input
                      type="hidden"
                      name="participantId"
                      value={applicant.userId}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={randomUUID()}
                    />
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar name={applicant.name} index={index} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {applicant.name}
                        </p>
                        <p className="text-xs text-muted-foreground">승인 대기</p>
                      </div>
                    </div>
                    <PendingSubmitButton
                      pendingLabel="승인하는 중..."
                      disabled={!canApprove}
                    >
                      참여 승인
                    </PendingSubmitButton>
                  </form>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                대기 중인 참여 신청이 없습니다.
              </p>
            )}
            {!departureOpen ? (
              <p className="text-xs text-warn">출발 시각이 지나 승인할 수 없습니다.</p>
            ) : isAtCapacity ? (
              <p className="text-xs text-muted-foreground">
                최대 인원에 도달해 추가 승인할 수 없습니다.
              </p>
            ) : null}
          </Card>
        ) : null}

        <Card className="gap-3">
          <CardTitle>{isHost ? '확정 참여자' : '내 참여 상태'}</CardTitle>
          {confirmedParticipants.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {confirmedParticipants.map((participant, index) => (
                <li key={participant.userId} className="flex items-center gap-3">
                  <Avatar name={participant.name} index={index} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {isHost ? participant.name : maskName(participant.name)}
                  </span>
                  <StatusBadge tone={participant.role === 'HOST' ? 'brand' : 'muted'}>
                    {participant.role === 'HOST'
                      ? '방장'
                      : participantStatusLabel(participant.status)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 확정된 참여 정보가 없습니다.
            </p>
          )}
        </Card>
      </main>

      {!isHost ? (
        <BottomBar>
          {canApply ? (
            <form action={applyFromRoomAction}>
              <input type="hidden" name="tripId" value={room.tripId} />
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <PendingSubmitButton pendingLabel="신청하는 중...">
                참여 신청
              </PendingSubmitButton>
            </form>
          ) : (
            <div className="rounded-xl bg-muted px-4 py-3 text-center text-sm font-semibold">
              {applicationUnavailableReason({
                status: room.status,
                currentUserStatus: room.currentUserStatus,
                departureOpen,
                isAtCapacity,
              })}
            </div>
          )}
        </BottomBar>
      ) : null}
    </MobileShell>
  )
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function applicationUnavailableReason({
  status,
  currentUserStatus,
  departureOpen,
  isAtCapacity,
}: {
  status: string
  currentUserStatus: string | null
  departureOpen: boolean
  isAtCapacity: boolean
}) {
  if (currentUserStatus) {
    return `현재 참여 상태: ${participantStatusLabel(currentUserStatus)}`
  }
  if (status !== 'OPEN') return '모집 중인 방에만 참여 신청할 수 있습니다.'
  if (!departureOpen) return '출발 시각이 지나 참여 신청할 수 없습니다.'
  if (isAtCapacity) return '최대 인원에 도달한 방입니다.'
  return '현재 참여 신청을 할 수 없습니다.'
}
