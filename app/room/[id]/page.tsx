'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Share2,
  Flag as FlagIcon,
  Clock,
  MapPin,
  Sparkles,
  Navigation,
  ShieldAlert,
  Coins,
  UserPlus,
} from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { Card, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/status-badge'
import { Avatar } from '@/components/avatar'
import { RouteMap } from '@/components/route-map'
import { useApp } from '@/components/app-provider'
import { formatPoints, formatWon, getRoomById } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { rooms, user, depositAndJoin, closeRoom, joinedRoomIds, toast } = useApp()

  const room = rooms.find((r) => r.id === params.id) ?? getRoomById(params.id)
  const [view, setView] = useState<'member' | 'host'>('member')
  const [depositOpen, setDepositOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)

  if (!room) {
    return (
      <MobileShell withTabBar={false}>
        <TopBar title="방 정보" />
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          존재하지 않는 방이에요.
        </div>
      </MobileShell>
    )
  }

  const closed = room.status === 'closed'
  const joined = joinedRoomIds.includes(room.id)
  const confirmedCount = Math.min(room.members.length + (joined ? 1 : 0), room.maxSeats)
  const filledPct = (room.members.length / room.maxSeats) * 100

  function handleDeposit() {
    depositAndJoin(room)
    setDepositOpen(false)
    router.push(`/room/${room.id}/confirm`)
  }

  function handleClose() {
    closeRoom(room.id)
    setCloseOpen(false)
    toast('모집이 마감되었어요.', 'warn')
  }

  return (
    <MobileShell withTabBar={false}>
      <TopBar
        title="동승 방"
        right={
          <>
            <button
              type="button"
              aria-label="공유"
              className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
            >
              <Share2 className="size-5" />
            </button>
            <button
              type="button"
              aria-label="신고"
              className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
            >
              <FlagIcon className="size-5" />
            </button>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        {/* 프로토타입용 시점 전환 */}
        <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
          {[
            { v: 'member', label: '참여자 화면' },
            { v: 'host', label: '방장 화면' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setView(o.v as 'member' | 'host')}
              className={cn(
                'flex-1 rounded-full py-2 transition-colors',
                view === o.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* 상태 */}
        <div className="flex items-center gap-2">
          {closed ? (
            <StatusBadge tone="muted">모집 마감</StatusBadge>
          ) : (
            <StatusBadge tone="mint">모집 중</StatusBadge>
          )}
          <StatusBadge tone="warn" icon={Clock}>
            출발까지 {room.minutesUntilDepart}분
          </StatusBadge>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold">
              {room.members.length}명 참여 / 최대 {room.maxSeats}명
            </span>
            <span className="text-muted-foreground">
              최소 2명 모이면 출발 가능
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${filledPct}%` }}
            />
          </div>
        </div>

        {/* 경로 카드 */}
        <Card className="gap-3 p-0">
          <RouteMap
            origin={room.origin}
            destination={room.destination}
            className="h-40 rounded-b-none"
          />
          <div className="flex flex-col gap-2 p-4">
            <Line icon={MapPin} tone="text-info" label="출발" value={room.origin} />
            <Line icon={FlagIcon} tone="text-warn" label="도착" value={room.destination} />
            <Line icon={Clock} tone="text-foreground" label="출발 시간" value={room.departLabel} />
          </div>
        </Card>

        {/* 참여자 */}
        <Card className="gap-3">
          <CardTitle>함께 이동하는 사람</CardTitle>
          <div className="flex flex-col gap-2">
            {room.members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.displayName} index={i} size="sm" />
                <span className="text-sm font-semibold">
                  {maskName(m.displayName)}
                </span>
                {m.role === 'host' ? (
                  <StatusBadge tone="brand" className="ml-auto">
                    방장
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="muted" className="ml-auto">
                    참여자
                  </StatusBadge>
                )}
              </div>
            ))}
            {Array.from({
              length: Math.max(room.maxSeats - room.members.length, 0),
            }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                  <UserPlus className="size-4" />
                </span>
                참여자 모집 중
              </div>
            ))}
          </div>
        </Card>

        {/* 요금·포인트 */}
        <Card className="gap-2">
          <CardTitle>요금 · 포인트</CardTitle>
          <InfoRow label="예상 총 요금" value={formatWon(room.estimatedFare)} />
          <InfoRow label="현재 확정 인원" value={`${confirmedCount}명`} />
          <InfoRow
            label="1인 예상 예치 포인트"
            value={formatPoints(room.perPersonPoints)}
            emphasize
          />
          <InfoRow label="포인트 잔액" value={formatPoints(user.points)} />
          <p className="mt-1 rounded-xl bg-secondary/50 px-3 py-2 text-xs text-secondary-foreground">
            참여 확정 시 예상 분담 포인트가 예치돼요.
          </p>
        </Card>

        {/* AI 추천 이유 */}
        <Card className="gap-2 border-info/30 bg-info-soft">
          <div className="flex items-center gap-1.5 text-sm font-bold text-info">
            <Sparkles className="size-4" />왜 이 방을 추천했나요?
          </div>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground/80">
            <li className="flex items-center gap-2">
              <Navigation className="size-4 text-info" />내 출발지에서{' '}
              {room.reason.fromOriginMeters}m 떨어져 있어요.
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-info" />
              희망 목적지와 {room.reason.toDestMeters}m 차이예요.
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-4 text-info" />
              예상 우회 시간은 약 {room.reason.detourMinutes}분이에요.
            </li>
          </ul>
        </Card>

        {/* 노쇼 정책 */}
        <Card className="gap-1.5 border-warn/30 bg-warn-soft">
          <div className="flex items-center gap-1.5 text-sm font-bold text-warn">
            <ShieldAlert className="size-4" />
            노쇼 정책
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            참여 확정 후 집결 시간에 오지 않아도, 확정 인원을 기준으로 비용이
            정산돼요.
          </p>
        </Card>
      </div>

      <BottomBar>
        {view === 'host' ? (
          <BigButton
            tone="warn"
            onClick={() => setCloseOpen(true)}
            disabled={closed}
          >
            {closed ? '마감된 방이에요' : '모집 마감하기'}
          </BigButton>
        ) : joined ? (
          <BigButton tone="mint" onClick={() => router.push(`/room/${room.id}/gathering`)}>
            집결 화면으로 이동
          </BigButton>
        ) : (
          <BigButton onClick={() => setDepositOpen(true)} disabled={closed}>
            <Coins className="size-5" />
            {formatPoints(room.perPersonPoints)} 예치하고 참여하기
          </BigButton>
        )}
      </BottomBar>

      {/* 예치 확인 모달 */}
      <Modal open={depositOpen} onClose={() => setDepositOpen(false)}>
        <h2 className="text-lg font-extrabold">포인트를 예치할까요?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          참여를 확정하면 예상 분담금{' '}
          <span className="font-bold text-foreground">
            {formatPoints(room.perPersonPoints)}
          </span>
          이 예치돼요. 실제 요금 확정 후 차액은 반환되거나 추가 차감돼요.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <BigButton onClick={handleDeposit}>
            {formatPoints(room.perPersonPoints)} 예치하고 참여
          </BigButton>
          <BigButton tone="outline" onClick={() => setDepositOpen(false)}>
            취소
          </BigButton>
        </div>
      </Modal>

      {/* 모집 마감 모달 */}
      <Modal open={closeOpen} onClose={() => setCloseOpen(false)}>
        <h2 className="text-lg font-extrabold">지금 모집을 마감할까요?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          마감 후에는 새 참여자를 받을 수 없어요.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <BigButton tone="warn" onClick={handleClose}>
            모집 마감
          </BigButton>
          <BigButton tone="outline" onClick={() => setCloseOpen(false)}>
            취소
          </BigButton>
        </div>
      </Modal>
    </MobileShell>
  )
}

function maskName(name: string) {
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(name.length - 1)
}

function Line({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={cn('size-4', tone)} />
      <span className="w-16 text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function InfoRow({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-semibold',
          emphasize && 'text-base font-extrabold text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}
