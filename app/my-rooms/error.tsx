'use client'

import { RouteErrorState } from '@/components/route-error-state'

export default function MyRoomsError({ reset }: { reset: () => void }) {
  return <RouteErrorState title="내 방을 불러오지 못했습니다." reset={reset} />
}
