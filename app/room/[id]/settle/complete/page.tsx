'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { Card, CardTitle } from '@/components/ui/card'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { formatPoints, formatWon, getRoomById } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function SettleCompletePage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  )
}

function Content() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const room = getRoomById(params.id)
  const fare = Number(search.get('fare')) || 13500

  const confirmed = 3
  const finalShare = Math.round(fare / confirmed / 100) * 100

  const timeline = [
    { label: '관리자 지급', amount: 30000 },
    { label: '예상 요금 예치', amount: -4000 },
    { label: '최종 정산 추가 차감', amount: -(finalShare - 4000) },
  ]

  return (
    <MobileShell withTabBar={false}>
      <div className="flex flex-1 flex-col px-6 pb-32 pt-14">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-mint text-mint-foreground shadow-lg shadow-mint/30 animate-in zoom-in">
            <CheckCircle2 className="size-11" strokeWidth={2.4} />
          </span>
          <h1 className="mt-6 text-2xl font-extrabold">정산이 완료되었어요</h1>
        </div>

        <Card className="mt-8 gap-2">
          <div className="flex items-center justify-center gap-2 pb-2 text-sm font-bold">
            <span>{room?.origin ?? '전북대학교'}</span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span>{room?.destination ?? '전주역'}</span>
          </div>
          <Row label="실제 택시비" value={formatWon(fare)} />
          <Row label="확정 인원" value={`${confirmed}명`} />
          <div className="border-t border-border pt-2">
            <Row label="내 최종 부담" value={formatPoints(finalShare)} emphasize />
          </div>
        </Card>

        <div className="mt-4">
          <CardTitle className="mb-3">포인트 거래 내역</CardTitle>
          <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-5">
            {timeline.map((t, i) => (
              <li key={i} className="relative">
                <span
                  className={cn(
                    'absolute -left-[27px] top-0.5 size-3 rounded-full ring-4 ring-background',
                    t.amount >= 0 ? 'bg-mint' : 'bg-warn',
                  )}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.label}</span>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      t.amount >= 0 ? 'text-mint' : 'text-warn',
                    )}
                  >
                    {t.amount >= 0 ? '+' : ''}
                    {formatPoints(t.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <BottomBar>
        <Link href="/home" className="block">
          <BigButton>홈으로 돌아가기</BigButton>
        </Link>
      </BottomBar>
    </MobileShell>
  )
}

function Row({
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
