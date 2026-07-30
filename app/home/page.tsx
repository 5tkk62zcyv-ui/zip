import Link from 'next/link'
import { Coins, Info, Plus } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { DatabaseRoomCard } from '@/components/database-room-card'
import { EmptyState } from '@/components/empty-state'
import { MobileShell } from '@/components/mobile-shell'
import { TabBar } from '@/components/tab-bar'
import { requireCompleteUser } from '@/lib/auth/session'
import { getCoreDashboard } from '@/lib/core/service'

export default async function HomePage() {
  const user = await requireCompleteUser()
  const data = await getCoreDashboard(user.userId, user.role === 'ADMIN')

  return (
    <MobileShell>
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <BrandLogo size="sm" />
        <Link
          href="/my-rooms"
          className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-bold shadow-sm"
        >
          내 방
        </Link>
      </header>

      <main className="flex-1 px-5">
        <h1 className="text-xl font-extrabold">안녕하세요, {user.name}님</h1>

        <Link
          href="/points"
          className="mt-4 block rounded-2xl bg-foreground p-4 text-background shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Coins className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs text-background/70">사용 가능 포인트</p>
                <p className="text-lg font-extrabold">
                  {Number(data.balance.availablePoints).toLocaleString('ko-KR')}P
                </p>
              </div>
            </div>
            <span className="rounded-full bg-background/15 px-3 py-1 text-xs font-semibold">
              내역 보기
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-background/70">
            <Info className="size-3.5" aria-hidden />
            포인트는 관리자가 지급하는 가상 포인트입니다.
          </p>
        </Link>

        <section className="mt-7 pb-4" aria-labelledby="room-list-heading">
          <h2 id="room-list-heading" className="text-lg font-extrabold">
            모집 방
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            실제 등록된 방의 출발 정보와 참여 현황을 확인하세요.
          </p>

          {data.trips.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4">
              {data.trips.map((room) => (
                <DatabaseRoomCard
                  key={room.tripId}
                  room={room}
                  currentUserId={user.userId}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState label="현재 확인할 수 있는 모집 방이 없습니다." />
            </div>
          )}

          <Link
            href="/create"
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-primary/10 px-4 py-4 text-base font-bold transition-transform active:scale-[0.98]"
          >
            <Plus className="size-5" aria-hidden />
            새 동승 방 만들기
          </Link>
        </section>
      </main>

      <TabBar />
    </MobileShell>
  )
}
