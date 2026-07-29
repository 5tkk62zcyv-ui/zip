'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Camera, Info, Receipt } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { Card, CardTitle } from '@/components/ui/card'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { useApp } from '@/components/app-provider'
import { formatPoints, formatWon, getRoomById } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function SettlePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { rooms, settleAdjust, toast } = useApp()
  const room = rooms.find((r) => r.id === params.id) ?? getRoomById(params.id)

  const [view, setView] = useState<'host' | 'member'>('host')
  const [fare, setFare] = useState(13500)

  if (!room) return null

  const confirmed = 3
  const deposit = round100(room.estimatedFare / confirmed)
  const finalShare = round100(fare / confirmed)
  const diff = finalShare - deposit // >0 추가 차감, <0 반환

  function finish() {
    settleAdjust(diff)
    toast('정산이 진행되었어요.', 'success')
    router.push(`/room/${room!.id}/settle/complete?fare=${fare}`)
  }

  return (
    <MobileShell withTabBar={false}>
      <TopBar title="정산" subtitle={`${room.origin} → ${room.destination}`} />

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
          {[
            { v: 'host', label: '방장 화면' },
            { v: 'member', label: '참여자 화면' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setView(o.v as 'host' | 'member')}
              className={cn(
                'flex-1 rounded-full py-2 transition-colors',
                view === o.v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {view === 'host' ? (
          <>
            <div>
              <h2 className="text-lg font-extrabold">실제 택시비를 입력해주세요</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                미터기 요금을 입력하면 자동으로 정산돼요.
              </p>
            </div>

            <Card className="gap-2">
              <label className="text-sm font-bold">실제 택시비</label>
              <div className="relative">
                <input
                  inputMode="numeric"
                  value={fare}
                  onChange={(e) =>
                    setFare(Number(e.target.value.replace(/\D/g, '')) || 0)
                  }
                  className="app-input pr-10 text-lg font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  원
                </span>
              </div>
              <button
                type="button"
                onClick={() => toast('영수증 첨부는 준비 중이에요. (UI 목업)')}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground"
              >
                <Camera className="size-4" />
                영수증 사진 첨부
              </button>
            </Card>

            <SettlePreview
              fare={fare}
              confirmed={confirmed}
              finalShare={finalShare}
              deposit={deposit}
              diff={diff}
            />

            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              노쇼가 발생해도 확정 인원({confirmed}명) 기준으로 비용을 나눠요.
            </p>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-extrabold">정산 내용을 확인해주세요</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                방장이 입력한 실제 요금 기준이에요.
              </p>
            </div>

            <Card className="gap-2">
              <Row label="실제 총 택시비" value={formatWon(fare)} />
              <Row label="확정 인원" value={`${confirmed}명`} />
              <div className="border-t border-border pt-2">
                <Row label="내 최종 부담" value={formatPoints(finalShare)} emphasize />
              </div>
              <Row label="예치 포인트" value={formatPoints(deposit)} />
              <Row
                label={diff >= 0 ? '추가 차감 예정' : '반환 예정'}
                value={`${diff >= 0 ? '-' : '+'} ${formatPoints(Math.abs(diff))}`}
                tone={diff >= 0 ? 'warn' : 'mint'}
              />
            </Card>

            <div className="flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-xs leading-relaxed text-foreground/80">
              <Receipt className="size-4 shrink-0 text-warn" />
              노쇼가 발생해도 확정 인원 기준으로 정산되는 점을 확인했어요.
            </div>
          </>
        )}
      </div>

      <BottomBar className="flex flex-col gap-2">
        {view === 'host' ? (
          <BigButton onClick={finish}>참여자에게 정산 요청하기</BigButton>
        ) : (
          <>
            <BigButton onClick={finish}>정산에 동의하기</BigButton>
            <BigButton
              tone="outline"
              onClick={() => toast('이의 제기가 접수되었어요. (UI 목업)', 'warn')}
            >
              이의 제기
            </BigButton>
          </>
        )}
      </BottomBar>
    </MobileShell>
  )
}

function SettlePreview({
  fare,
  confirmed,
  finalShare,
  deposit,
  diff,
}: {
  fare: number
  confirmed: number
  finalShare: number
  deposit: number
  diff: number
}) {
  return (
    <Card className="gap-2 bg-secondary/40">
      <CardTitle>정산 미리보기</CardTitle>
      <Row label="실제 택시비" value={formatWon(fare)} />
      <Row label="확정 인원" value={`${confirmed}명`} />
      <Row label="1인 최종 부담" value={formatPoints(finalShare)} emphasize />
      <Row label="기존 예치금" value={formatPoints(deposit)} />
      <div className="border-t border-border pt-2">
        <Row
          label={diff >= 0 ? '추가 차감' : '차액 반환'}
          value={`${diff >= 0 ? '-' : '+'} ${formatPoints(Math.abs(diff))}`}
          tone={diff >= 0 ? 'warn' : 'mint'}
        />
      </div>
    </Card>
  )
}

function Row({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string
  value: string
  emphasize?: boolean
  tone?: 'warn' | 'mint'
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-semibold',
          emphasize && 'text-base font-extrabold text-foreground',
          tone === 'warn' && 'font-bold text-warn',
          tone === 'mint' && 'font-bold text-mint',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function round100(n: number) {
  return Math.round(n / 100) * 100
}
