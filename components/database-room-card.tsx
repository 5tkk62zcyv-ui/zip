import Link from 'next/link'
import { ArrowRight, Clock, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'

export type DatabaseRoomSummary = {
  tripId: string
  hostUserId: string
  hostName: string
  origin: string
  destination: string
  departureAt: string
  maxParticipants: number
  estimatedFare: number | null
  status: string
  approvedCount: number
  currentUserStatus: string | null
}

const roomStatusLabels: Record<string, string> = {
  OPEN: '모집 중',
  CLOSED: '모집 종료',
  CONFIRMED: '출발 확정',
  SETTLEMENT_PENDING: '정산 대기',
  COMPLETED: '이용 완료',
  CANCELLED: '취소됨',
  EXPIRED: '인원 미달 종료',
}

const participantStatusLabels: Record<string, string> = {
  APPLIED: '승인 대기',
  APPROVED: '참여 승인',
  DEPOSITED: '예치 완료',
  CHECKED_IN: '집결 완료',
  NO_SHOW: '노쇼',
  DISPUTED: '이의 제기',
  COMPLETED: '이용 완료',
  CANCELLED: '참여 취소',
}

export function roomStatusLabel(status: string) {
  return roomStatusLabels[status] ?? status
}

export function participantStatusLabel(status: string | null) {
  if (!status) return null
  return participantStatusLabels[status] ?? status
}

export function estimatedShareLabel(room: DatabaseRoomSummary) {
  if (room.estimatedFare === null) return '산정 전'
  const participantCount = Math.max(room.approvedCount, 1)
  return `${Math.ceil(room.estimatedFare / participantCount).toLocaleString('ko-KR')}P`
}

export function DatabaseRoomCard({
  room,
  currentUserId,
}: {
  room: DatabaseRoomSummary
  currentUserId: string
}) {
  const isOpen = room.status === 'OPEN'
  const isHost = room.hostUserId === currentUserId
  const userStatus = participantStatusLabel(room.currentUserStatus)
  const availableSeats = Math.max(room.maxParticipants - room.approvedCount, 0)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={isOpen ? 'mint' : 'muted'}>
          {roomStatusLabel(room.status)}
        </StatusBadge>
        <StatusBadge tone={availableSeats > 0 ? 'brand' : 'muted'} icon={Users}>
          {room.approvedCount}/{room.maxParticipants}명
        </StatusBadge>
        {isHost ? <StatusBadge tone="info">내가 만든 방</StatusBadge> : null}
        {!isHost && userStatus ? (
          <StatusBadge tone="info">내 상태: {userStatus}</StatusBadge>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-lg font-bold">
        <span>{room.origin}</span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>{room.destination}</span>
      </div>

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{formatDeparture(room.departureAt)} 출발</span>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/70 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">예상 1인 분담금</dt>
          <dd className="mt-0.5 font-extrabold">{estimatedShareLabel(room)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">방장</dt>
          <dd className="mt-0.5 font-semibold">{maskName(room.hostName)}</dd>
        </div>
      </dl>

      {room.estimatedFare === null ? (
        <p className="text-xs text-muted-foreground">
          지도 기반 예상 요금이 아직 산정되지 않아 분담금을 표시하지 않습니다.
        </p>
      ) : null}

      <Link
        href={`/room/${room.tripId}`}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background transition-transform active:scale-[0.99]"
      >
        방 상세 보기
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  )
}

export function formatDeparture(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function maskName(name: string) {
  if (name.length < 2) return name
  return `${name.slice(0, 1)}${'*'.repeat(name.length - 1)}`
}
