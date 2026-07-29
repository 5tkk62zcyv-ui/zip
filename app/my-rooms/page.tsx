'use client'

import { useApp } from '@/components/app-provider'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { TabBar } from '@/components/tab-bar'
import { RoomCard } from '@/components/room-card'
import { EmptyState } from '@/components/empty-state'
import { Car, UsersRound } from 'lucide-react'

export default function MyRoomsPage() {
  const { rooms, joinedRoomIds, user } = useApp()

  const hosted = rooms.filter((r) => r.members.some((m) => m.role === 'host' && m.displayName === user.name))
  const joined = rooms.filter((r) => joinedRoomIds.includes(r.id))

  return (
    <MobileShell>
      <TopBar title="내 방" back={false} />
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-4">
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Car className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">내가 만든 방</h2>
          </div>
          {hosted.length > 0 ? (
            <div className="flex flex-col gap-3">
              {hosted.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          ) : (
            <EmptyState label="아직 만든 방이 없어요" />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <UsersRound className="size-4 text-mint" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">참여 중인 방</h2>
          </div>
          {joined.length > 0 ? (
            <div className="flex flex-col gap-3">
              {joined.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          ) : (
            <EmptyState label="참여 중인 방이 없어요" />
          )}
        </section>
      </div>
      <TabBar />
    </MobileShell>
  )
}
