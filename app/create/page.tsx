'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { Calendar, Flag, Info, MapPin, Users } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import {
  createRoomAction,
  type CreateTripState,
} from '@/app/core/actions'

const initialState: CreateTripState = {}

export default function CreateRoomPage() {
  const [state, action, pending] = useActionState(
    createRoomAction,
    initialState,
  )
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [departureLocal, setDepartureLocal] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(
      () => setIdempotencyKey(crypto.randomUUID()),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [])

  const departureAt = useMemo(() => {
    if (!departureLocal) return ''
    const value = new Date(departureLocal)
    return Number.isFinite(value.getTime()) ? value.toISOString() : ''
  }, [departureLocal])

  return (
    <MobileShell withTabBar={false}>
      <TopBar
        title="동승 방 만들기"
        subtitle="출발 정보와 모집 인원을 입력해주세요"
      />

      <form action={action} className="flex flex-1 flex-col">
        <input
          type="hidden"
          name="idempotencyKey"
          value={idempotencyKey}
        />
        <input type="hidden" name="departureAt" value={departureAt} />

        <fieldset
          disabled={pending || !idempotencyKey}
          className="flex flex-1 flex-col gap-6 px-5 py-6 pb-32 disabled:opacity-70"
        >
          <Field
            id="origin"
            label="출발지"
            icon={MapPin}
            iconClassName="text-info"
            error={state.fieldErrors?.origin?.[0]}
          >
            <input
              id="origin"
              name="origin"
              required
              maxLength={120}
              autoComplete="off"
              placeholder="예: 전북대학교 정문"
              aria-invalid={Boolean(state.fieldErrors?.origin)}
              aria-describedby={
                state.fieldErrors?.origin ? 'origin-error origin-help' : 'origin-help'
              }
              className="app-input"
            />
            <p
              id="origin-help"
              className="mt-2 text-xs leading-relaxed text-muted-foreground"
            >
              지도 검색은 다음 스프린트에서 연결됩니다. 지금은 알아보기 쉬운
              장소명을 입력해주세요.
            </p>
          </Field>

          <Field
            id="destination"
            label="도착지"
            icon={Flag}
            iconClassName="text-warn"
            error={state.fieldErrors?.destination?.[0]}
          >
            <input
              id="destination"
              name="destination"
              required
              maxLength={120}
              autoComplete="off"
              placeholder="예: 전주역"
              aria-invalid={Boolean(state.fieldErrors?.destination)}
              aria-describedby={
                state.fieldErrors?.destination ? 'destination-error' : undefined
              }
              className="app-input"
            />
          </Field>

          <Field
            id="departureLocal"
            label="출발 시각"
            icon={Calendar}
            error={state.fieldErrors?.departureAt?.[0]}
          >
            <input
              id="departureLocal"
              type="datetime-local"
              required
              value={departureLocal}
              onChange={(event) => setDepartureLocal(event.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.departureAt)}
              aria-describedby={
                state.fieldErrors?.departureAt
                  ? 'departureLocal-error departure-help'
                  : 'departure-help'
              }
              className="app-input"
            />
            <p
              id="departure-help"
              className="mt-2 text-xs leading-relaxed text-muted-foreground"
            >
              현재 이후의 시각을 선택해주세요.
            </p>
          </Field>

          <fieldset>
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <Users className="size-4" aria-hidden />
              최대 인원
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((count) => (
                <label
                  key={count}
                  className="cursor-pointer rounded-xl border border-border bg-card py-3 text-center text-sm font-bold has-[:checked]:border-primary has-[:checked]:bg-primary/15 focus-within:ring-2 focus-within:ring-ring"
                >
                  <input
                    type="radio"
                    name="maxParticipants"
                    value={count}
                    defaultChecked={count === 3}
                    required
                    className="sr-only"
                  />
                  {count}명
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              방장을 포함해 2~4명까지 모집할 수 있어요.
            </p>
            {state.fieldErrors?.maxParticipants?.[0] ? (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {state.fieldErrors.maxParticipants[0]}
              </p>
            ) : null}
          </fieldset>

          <div className="flex items-start gap-2 rounded-2xl border border-info/30 bg-info-soft px-4 py-3 text-sm">
            <Info
              className="mt-0.5 size-4 shrink-0 text-info"
              aria-hidden
            />
            <p className="leading-relaxed">
              예상 거리·시간·요금은 지도 API가 연결되는 다음 스프린트에서
              산정합니다. 요금이 산정되기 전에는 모집 확정과 포인트 예치를
              진행할 수 없어요.
            </p>
          </div>

          <p
            aria-live="polite"
            className="min-h-5 text-sm text-destructive"
          >
            {pending ? '방 정보를 안전하게 저장하고 있어요.' : state.message}
          </p>
        </fieldset>

        <BottomBar>
          <BigButton type="submit" disabled={pending || !idempotencyKey}>
            {pending ? '방 만드는 중…' : '이 조건으로 방 만들기'}
          </BigButton>
        </BottomBar>
      </form>
    </MobileShell>
  )
}

function Field({
  id,
  label,
  icon: Icon,
  iconClassName,
  error,
  children,
}: {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  iconClassName?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-1.5 text-sm font-bold"
      >
        <Icon
          className={`size-4 ${iconClassName ?? 'text-foreground'}`}
          aria-hidden
        />
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
