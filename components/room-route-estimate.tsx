'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Coordinates, RouteEstimate } from '@/lib/routing/types'

export function RoomRouteEstimate({
  origin,
  destination,
  maxParticipants,
}: {
  origin: Coordinates
  destination: Coordinates
  maxParticipants: number
}) {
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/route-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination }),
      })
      const body = (await response.json()) as { estimate?: RouteEstimate; error?: string }
      if (!response.ok || !body.estimate) throw new Error(body.error || '경로를 조회하지 못했습니다.')
      setEstimate(body.estimate)
    } catch (reason) {
      setEstimate(null)
      setError(reason instanceof Error ? reason.message : '경로를 조회하지 못했습니다.')
    } finally { setLoading(false) }
  }, [destination, origin])
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  if (loading) return <p className="rounded-xl bg-muted p-3 text-xs">지도 API 경로·예상 요금 조회 중...</p>
  if (error) return <div className="rounded-xl bg-warn-soft p-3 text-xs"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-2 min-h-9 rounded-lg border px-3 font-bold">다시 시도</button></div>
  if (!estimate) return null
  return <div className="rounded-xl bg-info-soft p-3 text-xs">
    <p className="font-bold">지도 API 경로·예상 요금 · 현재 참고값</p>
    <p className="mt-1">{(estimate.distanceMeters / 1000).toFixed(1)}km · {Math.ceil(estimate.durationSeconds / 60)}분</p>
    <p className="mt-1">{estimate.estimatedFareWon === null ? '지도 API 요금 정보 없음' : `총 ${estimate.estimatedFareWon.toLocaleString('ko-KR')}원 · 1인 예상 ${Math.ceil(estimate.estimatedFareWon / maxParticipants).toLocaleString('ko-KR')}P`}</p>
    <p className="mt-1 text-muted-foreground">
      {estimate.provider === 'kakao' ? '카카오' : '네이버'} · {new Date(estimate.calculatedAt).toLocaleString('ko-KR')} 산정
    </p>
    <p className="mt-1 text-muted-foreground">확정 시 서버가 다시 산정하며 실제 예치 기준과 달라질 수 있습니다.</p>
  </div>
}
