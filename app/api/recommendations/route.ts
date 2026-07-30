import { NextResponse } from 'next/server'
import { getCurrentUser, hasCompleteProfile } from '@/lib/auth/session'
import { searchOpenTripRecommendations } from '@/lib/recommendations/place-search'
import type { SelectablePlaceResult } from '@/lib/routing/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !hasCompleteProfile(user)) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '요청 형식을 확인해주세요.' }, { status: 400 })
  }
  if (!isRequest(body)) {
    return NextResponse.json(
      { error: '검색 결과에서 출발지와 목적지를 선택해주세요.' },
      { status: 400 },
    )
  }
  try {
    const result = await searchOpenTripRecommendations({
      userId: user.userId,
      origin: body.origin,
      destination: body.destination,
    })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { error: '추천을 계산하지 못했습니다. 장소를 다시 선택해주세요.' },
      { status: 400 },
    )
  }
}

function isRequest(
  value: unknown,
): value is {
  origin: SelectablePlaceResult
  destination: SelectablePlaceResult
} {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return isPlace(body.origin) && isPlace(body.destination)
}

function isPlace(value: unknown): value is SelectablePlaceResult {
  if (!value || typeof value !== 'object') return false
  const place = value as Record<string, unknown>
  return (
    typeof place.label === 'string' &&
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number' &&
    (place.provider === 'kakao' || place.provider === 'naver') &&
    typeof place.providerPlaceId === 'string' &&
    typeof place.selectionToken === 'string'
  )
}
