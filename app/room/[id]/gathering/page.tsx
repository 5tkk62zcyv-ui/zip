'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MessageCircle, MapPin, ShieldCheck, Check, Clock } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { Card, CardTitle } from '@/components/ui/card'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { StatusBadge } from '@/components/status-badge'
import { Avatar } from '@/components/avatar'
import { useApp } from '@/components/app-provider'
import { getRoomById } from '@/lib/mock-data'

export default function GatheringPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { rooms, toast } = useApp()
  const room = rooms.find((r) => r.id === params.id) ?? getRoomById(params.id)

  const [seconds, setSeconds] = useState(8 * 60 + 24)
  const [arrived, setArrived] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  if (!room) return null

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const participants = [
    ...room.members.map((m) => ({ name: m.displayName, role: m.role, checkedIn: m.role === 'host' })),
  ]

  return (
    <MobileShell withTabBar={false}>
      <TopBar title="출발 준비" subtitle={`${room.origin} → ${room.destination}`} />

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex flex-col items-center rounded-3xl bg-foreground px-6 py-8 text-background">
          <StatusBadge tone="brand" className="mb-4">
            출발 준비 중
          </StatusBadge>
          <p className="text-sm text-background/70">출발까지</p>
          <p className="mt-1 font-mono text-5xl font-extrabold tabular-nums">
            {mm}:{ss}
          </p>
        </div>

        <Card className="gap-2">
          <CardTitle>집결 장소</CardTitle>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-5 text-info" />
            <p className="text-sm font-semibold leading-relaxed">
              {room.origin} 정문 앞 택시 승강장
            </p>
          </div>
        </Card>

        <Card className="gap-3">
          <CardTitle>참여자 체크인</CardTitle>
          <div className="flex flex-col gap-2">
            {participants.map((p, i) => {
              const isMe = i === 1
              const checked = isMe ? arrived : p.checkedIn
              return (
                <div key={i} className="flex items-center gap-3">
                  <Avatar name={p.name} index={i} size="sm" />
                  <span className="text-sm font-semibold">
                    {maskName(p.name)}
                    {isMe ? ' (나)' : ''}
                  </span>
                  {checked ? (
                    <StatusBadge tone="mint" className="ml-auto" icon={Check}>
                      도착
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="muted" className="ml-auto" icon={Clock}>
                      이동 중
                    </StatusBadge>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => toast('채팅방은 준비 중이에요. (UI 목업)')}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold"
          >
            <MessageCircle className="size-4" />
            채팅방 열기
          </button>
        </Card>

        <Card className="gap-1.5 border-info/30 bg-info-soft">
          <div className="flex items-center gap-1.5 text-sm font-bold text-info">
            <ShieldCheck className="size-4" />
            안전 안내
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            낯선 사람과의 이동 전, 집결 장소와 참여자 정보를 확인하세요.
          </p>
        </Card>
      </div>

      <BottomBar className="flex flex-col gap-2">
        <BigButton
          tone={arrived ? 'mint' : 'primary'}
          onClick={() => {
            setArrived(true)
            toast('도착 체크인 완료!', 'success')
          }}
        >
          {arrived ? (
            <>
              <Check className="size-5" />
              도착 완료
            </>
          ) : (
            '내가 도착했어요'
          )}
        </BigButton>
        <BigButton tone="outline" onClick={() => router.push(`/room/${room.id}/settle`)}>
          도착 후 정산하기
        </BigButton>
      </BottomBar>
    </MobileShell>
  )
}

function maskName(name: string) {
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(name.length - 1)
}
