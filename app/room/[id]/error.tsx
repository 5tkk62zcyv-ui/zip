'use client'

import { RouteErrorState } from '@/components/route-error-state'

export default function RoomError({ reset }: { reset: () => void }) {
  return <RouteErrorState title="방 상세 정보를 불러오지 못했습니다." reset={reset} />
}
