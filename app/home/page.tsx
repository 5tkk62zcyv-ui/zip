'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Coins, Info, Plus } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TabBar } from '@/components/tab-bar'
import { RoomCard } from '@/components/room-card'
import { BrandLogo } from '@/components/brand-logo'
import { useApp } from '@/components/app-provider'
import { formatPoints } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const filters = ['전체', '내 주변', '같은 목적지', '출발 임박']

export default function HomePage() {
  const { user, rooms } = useApp()
  const [active, setActive] = useState('전체')

  const visibleRooms =
    active === '출발 임박'
      ? [...rooms].sort((a, b) => a.minutesUntilDepart - b.minutesUntilDepart)
      : rooms

  return (
    <MobileShell>
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <BrandLogo size="sm" />
        <button
          type="button"
          aria-label="알림"
          className="relative flex size-10 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-warn" />
        </button>
      </header>

      <div className="px-5">
        <h1 className="text-xl font-extrabold">안녕하세요, {user.name}님</h1>
      </div>

      {/* 포인트 카드 */}
      <div className="px-5 pt-3">
        <Link
          href="/points"
          className="block rounded-2xl bg-foreground p-4 text-background shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Coins className="size-5" />
              </span>
              <div>
                <p className="text-xs text-background/70">보유 포인트</p>
                <p className="text-lg font-extrabold">
                  {formatPoints(user.points)}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-background/15 px-3 py-1 text-xs font-semibold">
              내역 보기
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-background/70">
            <Info className="size-3.5" />
            포인트는 관리자 지급 방식으로 운영돼요.
          </p>
        </Link>
      </div>

      {/* 추천 방 */}
      <section className="mt-6 flex-1 px-5">
        <h2 className="text-lg font-extrabold">지금 출발할 수 있는 추천 방</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          출발지와 목적지가 가까운 방을 먼저 보여드려요.
        </p>

        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActive(f)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active === f
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {visibleRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>

        <Link
          href="/create"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-primary/10 py-4 text-base font-bold text-foreground transition-transform active:scale-[0.98]"
        >
          <Plus className="size-5" />새 동승 방 만들기
        </Link>
      </section>

      <TabBar />
    </MobileShell>
  )
}
