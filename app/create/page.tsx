'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { Calendar, Flag, MapPin, Search, Users } from 'lucide-react'
import { createRoomAction, type CreateTripState } from '@/app/core/actions'
import { BigButton, BottomBar } from '@/components/bottom-bar'
import { MobileShell } from '@/components/mobile-shell'
import { RouteMap } from '@/components/route-map'
import { TopBar } from '@/components/top-bar'
import type { RouteEstimate, SelectablePlaceResult } from '@/lib/routing/types'

const initialState: CreateTripState = {}

export default function CreateRoomPage() {
  const [state, action, pending] = useActionState(createRoomAction, initialState)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [departureLocal, setDepartureLocal] = useState('')
  const [origin, setOrigin] = useState<SelectablePlaceResult | null>(null)
  const [destination, setDestination] = useState<SelectablePlaceResult | null>(null)
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null)
  const [estimateError, setEstimateError] = useState('')
  const [estimating, setEstimating] = useState(false)
  const [estimateRetry, setEstimateRetry] = useState(0)
  const [maxParticipants, setMaxParticipants] = useState(3)

  useEffect(() => {
    const timer = window.setTimeout(
      () => setIdempotencyKey(crypto.randomUUID()),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!origin || !destination) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setEstimating(true)
      setEstimate(null)
      setEstimateError('')
      fetch('/api/route-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = (await response.json()) as {
            estimate?: RouteEstimate
            error?: string
          }
          if (!response.ok || !body.estimate) {
            throw new Error(body.error || '경로를 조회하지 못했습니다.')
          }
          setEstimate(body.estimate)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setEstimateError(
            error instanceof Error ? error.message : '경로를 조회하지 못했습니다.',
          )
        })
        .finally(() => setEstimating(false))
    }, 0)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [destination, estimateRetry, origin])

  const departureAt = useMemo(() => {
    if (!departureLocal) return ''
    const value = new Date(departureLocal)
    return Number.isFinite(value.getTime()) ? value.toISOString() : ''
  }, [departureLocal])
  const canCreate = Boolean(
    idempotencyKey && origin && destination && estimate?.estimatedFareWon,
  )

  return (
    <MobileShell withTabBar={false}>
      <TopBar title="동승 방 만들기" subtitle="장소와 출발 조건을 입력해 주세요" />
      <form action={action} className="flex flex-1 flex-col">
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="departureAt" value={departureAt} />
        <PlaceInputs prefix="origin" place={origin} />
        <PlaceInputs prefix="destination" place={destination} />

        <fieldset disabled={pending} className="flex flex-1 flex-col gap-5 px-5 py-5 pb-32 disabled:opacity-70">
          <PlaceSearch label="출발지" icon={MapPin} selected={origin} onSelect={(place) => { setOrigin(place); setEstimate(null) }} error={state.fieldErrors?.origin?.[0]} />
          <PlaceSearch label="목적지" icon={Flag} selected={destination} onSelect={(place) => { setDestination(place); setEstimate(null) }} error={state.fieldErrors?.destination?.[0]} />

          <RouteMap origin={origin} destination={destination} />
          <RouteSummary estimate={estimate} loading={estimating} error={estimateError} participants={maxParticipants} onRetry={() => setEstimateRetry((value) => value + 1)} />

          <label className="text-sm font-bold" htmlFor="departureLocal">
            <Calendar className="mr-1.5 inline size-4" aria-hidden /> 출발 시각
          </label>
          <input id="departureLocal" type="datetime-local" required value={departureLocal} onChange={(event) => setDepartureLocal(event.target.value)} className="app-input" />

          <fieldset>
            <legend className="mb-2 text-sm font-bold"><Users className="mr-1.5 inline size-4" aria-hidden />최대 인원</legend>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((count) => (
                <label key={count} className="rounded-full border bg-card py-3 text-center text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
                  <input className="sr-only" type="radio" name="maxParticipants" value={count} checked={maxParticipants === count} onChange={() => setMaxParticipants(count)} />
                  {count}명
                </label>
              ))}
            </div>
          </fieldset>

          <p className="min-h-5 text-sm text-destructive" aria-live="polite">
            {pending ? '서버에서 경로와 요금을 다시 확인하고 있습니다.' : state.message}
          </p>
        </fieldset>
        <BottomBar>
          <BigButton type="submit" disabled={pending || !canCreate}>
            {pending ? '방 만드는 중...' : '이 조건으로 방 만들기'}
          </BigButton>
        </BottomBar>
      </form>
    </MobileShell>
  )
}

function PlaceInputs({ prefix, place }: { prefix: 'origin' | 'destination'; place: SelectablePlaceResult | null }) {
  return <>
    <input type="hidden" name={prefix} value={place?.label ?? ''} />
    <input type="hidden" name={`${prefix}Latitude`} value={place?.latitude ?? ''} />
    <input type="hidden" name={`${prefix}Longitude`} value={place?.longitude ?? ''} />
    <input type="hidden" name={`${prefix}Provider`} value={place?.provider ?? ''} />
    <input type="hidden" name={`${prefix}ProviderPlaceId`} value={place?.providerPlaceId ?? ''} />
    <input type="hidden" name={`${prefix}SelectionToken`} value={place?.selectionToken ?? ''} />
  </>
}

function PlaceSearch({ label, icon: Icon, selected, onSelect, error }: {
  label: string
  icon: typeof MapPin
  selected: SelectablePlaceResult | null
  onSelect: (place: SelectablePlaceResult | null) => void
  error?: string
}) {
  const inputId = label === '출발지' ? 'origin-search' : 'destination-search'
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<SelectablePlaceResult[]>([])
  const [message, setMessage] = useState('')
  const [searching, setSearching] = useState(false)
  async function search() {
    setSearching(true); setMessage(''); setPlaces([]); onSelect(null)
    try {
      const response = await fetch(`/api/places?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
      const body = (await response.json()) as { places?: SelectablePlaceResult[]; error?: string }
      if (!response.ok || !body.places) throw new Error(body.error || '장소를 검색하지 못했습니다.')
      setPlaces(body.places)
    } catch (searchError) {
      setMessage(searchError instanceof Error ? searchError.message : '장소를 검색하지 못했습니다.')
    } finally { setSearching(false) }
  }
  return <div>
    <label htmlFor={inputId} className="mb-2 block text-sm font-bold"><Icon className="mr-1.5 inline size-4" aria-hidden />{label}</label>
    <div className="flex gap-2">
      <input id={inputId} value={query} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search() } }} onChange={(event) => { setQuery(event.target.value); if (selected) onSelect(null) }} maxLength={100} className="app-input focus-visible:ring-2 focus-visible:ring-ring" placeholder={`${label} 검색`} />
      <button aria-label={`${label} 검색`} type="button" onClick={() => void search()} disabled={searching || !query.trim()} className="min-h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-normal text-primary-foreground transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring">
        <Search className="size-4" aria-hidden />
      </button>
    </div>
    {places.length ? <ul className="mt-2 rounded-[18px] border bg-card p-1">{places.map((place) => <li key={`${place.provider}:${place.providerPlaceId}`}><button type="button" onClick={() => { onSelect(place); setPlaces([]); setQuery(place.label) }} className="min-h-11 w-full rounded-xl px-4 py-3 text-left text-base hover:bg-muted">{place.label}</button></li>)}</ul> : null}
    <p className="mt-1 text-xs text-destructive" role="status">{error || message}</p>
  </div>
}

function RouteSummary({ estimate, loading, error, participants, onRetry }: { estimate: RouteEstimate | null; loading: boolean; error: string; participants: number; onRetry: () => void }) {
  if (loading) return <p className="rounded-xl bg-muted p-3 text-sm">경로와 예상 요금을 조회하는 중...</p>
  if (error) return <div className="rounded-xl bg-warn-soft p-3 text-sm text-destructive" role="alert"><p>{error}</p><button type="button" onClick={onRetry} className="mt-2 min-h-9 rounded-lg border px-3 font-bold focus-visible:ring-2 focus-visible:ring-ring">경로 다시 시도</button></div>
  if (!estimate) return null
  return <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-3 text-sm">
    <div><dt className="text-xs text-muted-foreground">거리 · 시간</dt><dd className="font-bold">{(estimate.distanceMeters / 1000).toFixed(1)}km · {Math.ceil(estimate.durationSeconds / 60)}분</dd></div>
    <div><dt className="text-xs text-muted-foreground">예상 총요금</dt><dd className="font-bold">{estimate.estimatedFareWon === null ? '지도 API 요금 정보 없음' : `${estimate.estimatedFareWon.toLocaleString('ko-KR')}원`}</dd></div>
    <div className="col-span-2"><dt className="text-xs text-muted-foreground">최대 인원 기준 1인 예치</dt><dd className="font-extrabold">{estimate.estimatedFareWon === null ? '계산할 수 없음' : `${Math.ceil(estimate.estimatedFareWon / participants).toLocaleString('ko-KR')}P`}</dd></div>
  </dl>
}
