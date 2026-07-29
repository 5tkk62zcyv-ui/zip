'use client'

import { Coins, Info, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TabBar } from '@/components/tab-bar'
import { Card } from '@/components/ui/card'
import { useApp } from '@/components/app-provider'
import { formatPoints } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function PointsPage() {
  const { user, history } = useApp()

  return (
    <MobileShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
        <h1 className="text-lg font-extrabold">포인트</h1>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-5 py-5">
        <div className="rounded-2xl bg-foreground p-5 text-background">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Coins className="size-5" />
            </span>
            <div>
              <p className="text-xs text-background/70">보유 포인트</p>
              <p className="text-2xl font-extrabold">{formatPoints(user.points)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background/10 px-3 py-2.5">
              <p className="text-xs text-background/70">예치 포인트</p>
              <p className="text-base font-bold">{formatPoints(user.deposited)}</p>
            </div>
            <div className="rounded-xl bg-background/10 px-3 py-2.5">
              <p className="text-xs text-background/70">사용 가능</p>
              <p className="text-base font-bold">
                {formatPoints(user.points - user.deposited)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-2xl bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-secondary-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          포인트는 관리자가 지급하며, 서비스 안에서만 사용돼요. 별도의 충전은
          필요하지 않아요.
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold">포인트 내역</h2>
          <Card className="gap-0 p-0">
            {history.map((tx, i) => (
              <div
                key={tx.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5',
                  i !== history.length - 1 && 'border-b border-border',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full',
                    tx.amount >= 0
                      ? 'bg-mint-soft text-mint'
                      : 'bg-warn-soft text-warn',
                  )}
                >
                  {tx.amount >= 0 ? (
                    <ArrowDownLeft className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{tx.label}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                <span
                  className={cn(
                    'text-sm font-extrabold',
                    tx.amount >= 0 ? 'text-mint' : 'text-warn',
                  )}
                >
                  {tx.amount >= 0 ? '+' : ''}
                  {formatPoints(tx.amount)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <TabBar />
    </MobileShell>
  )
}
