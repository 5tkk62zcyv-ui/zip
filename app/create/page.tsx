'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Calendar,
  Info,
  LocateFixed,
  MapPin,
  Flag,
  Route,
  Clock,
  Coins,
} from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TabBar } from '@/components/tab-bar'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { useApp } from '@/components/app-provider'
import { formatPoints, formatWon } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const ESTIMATED_FARE = 12000

export default function CreateRoomPage() {
  const router = useRouter()
  const { toast } = useApp()
  const [origin, setOrigin] = useState('전북대학교')
  const [destination, setDestination] = useState('전주역')
  const [departLabel, setDepartLabel] = useState('오늘 22:30')
  const [maxSeats, setMaxSeats] = useState(3)
  const [approval, setApproval] = useState<'auto' | 'host'>('auto')
  const [allowNearby, setAllowNearby] = useState(true)

  const perPerson = Math.round(ESTIMATED_FARE / maxSeats / 100) * 100

  function handleCreate() {
    toast('동승 방이 만들어졌어요!', 'success')
    router.push('/room/room-1')
  }

  return (
    <MobileShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
        <h1 className="text-lg font-extrabold">동승 방 만들기</h1>
        <p className="text-sm text-muted-foreground">
          같은 방향의 학생을 모집해보세요.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 py-6">
        {/* 출발지 */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <MapPin className="size-4 text-info" />
            출발지
          </label>
          <div className="relative">
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="app-input pr-11"
            />
            <button
              type="button"
              aria-label="현재 위치 사용"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
            >
              <LocateFixed className="size-4" />
            </button>
          </div>
        </div>

        {/* 도착지 */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Flag className="size-4 text-warn" />
            도착지
          </label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="app-input"
          />
        </div>

        {/* 출발 시간 */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Calendar className="size-4 text-foreground" />
            출발 시간
          </label>
          <div className="flex items-center gap-2">
            {['오늘 21:50', '오늘 22:30', '오늘 23:10'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDepartLabel(t)}
                className={cn(
                  'flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors',
                  departLabel === t
                    ? 'border-primary bg-primary/15'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 최대 인원 */}
        <div>
          <label className="mb-2 block text-sm font-bold">최대 인원</label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxSeats(n)}
                className={cn(
                  'rounded-xl border py-3 text-sm font-bold transition-colors',
                  maxSeats === n
                    ? 'border-primary bg-primary/15'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {n}명
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            최소 2명이 모이면 출발할 수 있고, 최대 4명까지 함께 탈 수 있어요.
          </p>
        </div>

        {/* 승인 방식 */}
        <div>
          <label className="mb-2 block text-sm font-bold">승인 방식</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'auto', label: '자동 승인' },
              { v: 'host', label: '방장 승인' },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setApproval(o.v as 'auto' | 'host')}
                className={cn(
                  'rounded-xl border py-3 text-sm font-semibold transition-colors',
                  approval === o.v
                    ? 'border-primary bg-primary/15'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 인접 목적지 허용 토글 */}
        <button
          type="button"
          onClick={() => setAllowNearby((v) => !v)}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold">인접 목적지 동승 허용</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {destination} 근처로 가는 학생에게도 내 방을 추천해요.
            </p>
          </div>
          <span
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors',
              allowNearby ? 'bg-primary' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'absolute top-1 size-5 rounded-full bg-card shadow transition-transform',
                allowNearby ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </span>
        </button>

        {/* 예상 요금 카드 */}
        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <p className="mb-3 text-sm font-bold">예상 요금</p>
          <div className="flex flex-col gap-2 text-sm">
            <Row icon={Route} label="예상 거리" value="7.8km" />
            <Row icon={Clock} label="예상 소요 시간" value="20분" />
            <Row icon={Coins} label="예상 택시비" value={formatWon(ESTIMATED_FARE)} />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-card px-4 py-3">
            <span className="text-sm font-semibold">
              {maxSeats}명 기준 예상 분담금
            </span>
            <span className="text-lg font-extrabold text-foreground">
              {formatPoints(perPerson)}
            </span>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            예상 요금은 지도 API 기반 정보이며 실제 요금과 달라질 수 있어요.
          </p>
        </div>
      </div>

      <BottomBar>
        <BigButton onClick={handleCreate}>이 조건으로 방 만들기</BigButton>
      </BottomBar>

      <TabBar />
    </MobileShell>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
