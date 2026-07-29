'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Check, ArrowRight, Coins } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { Card } from '@/components/ui/card'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { useApp } from '@/components/app-provider'
import { formatPoints, getRoomById } from '@/lib/mock-data'

export default function ConfirmPage() {
  const params = useParams<{ id: string }>()
  const { user, rooms } = useApp()
  const room = rooms.find((r) => r.id === params.id) ?? getRoomById(params.id)

  const deposited = room?.perPersonPoints ?? user.deposited
  const available = user.points

  return (
    <MobileShell withTabBar={false}>
      <div className="flex flex-1 flex-col items-center px-6 pb-32 pt-16 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-mint text-mint-foreground shadow-lg shadow-mint/30 animate-in zoom-in">
          <Check className="size-10" strokeWidth={3} />
        </span>

        <h1 className="mt-6 text-2xl font-extrabold">
          동승 참여가 확정되었어요!
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-mint">
          <Coins className="size-4" />
          {formatPoints(deposited)}가 예치되었어요.
        </p>

        <Card className="mt-8 w-full gap-3 text-left">
          <Breakdown label="보유 포인트" value={formatPoints(available + deposited)} />
          <Breakdown label="예치 포인트" value={`- ${formatPoints(deposited)}`} tone="warn" />
          <div className="border-t border-border pt-3">
            <Breakdown
              label="사용 가능 포인트"
              value={formatPoints(available)}
              emphasize
            />
          </div>
        </Card>

        {room ? (
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary/50 px-4 py-3 text-sm font-semibold text-secondary-foreground">
            <span>{room.origin}</span>
            <ArrowRight className="size-4" />
            <span>{room.destination}</span>
          </div>
        ) : null}
      </div>

      <BottomBar>
        <Link href={`/room/${params.id}`} className="block">
          <BigButton>방으로 돌아가기</BigButton>
        </Link>
      </BottomBar>
    </MobileShell>
  )
}

function Breakdown({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string
  value: string
  tone?: 'warn'
  emphasize?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={
          emphasize
            ? 'text-lg font-extrabold text-foreground'
            : tone === 'warn'
              ? 'text-sm font-bold text-warn'
              : 'text-sm font-semibold'
        }
      >
        {value}
      </span>
    </div>
  )
}
