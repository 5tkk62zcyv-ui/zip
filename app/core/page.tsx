import Link from 'next/link'
import { Coins, Route, ShieldCheck, Users } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { Card } from '@/components/ui/card'
import { requireCompleteUser } from '@/lib/auth/session'
import { getCoreDashboard } from '@/lib/core/service'
import {
  applyAction,
  approveAction,
  confirmFareAction,
  createTripAction,
  depositAction,
  grantAction,
  settleAction,
  submitFareAction,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function CorePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const user = await requireCompleteUser()
  const query = await searchParams
  const data = await getCoreDashboard(user.userId, user.role === 'ADMIN')

  return (
    <MobileShell withTabBar={false}>
      <header className="border-b border-border px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">5분 핵심 흐름</p>
            <h1 className="text-xl font-extrabold">실제 모집·포인트·정산</h1>
          </div>
          <Link href="/home" className="text-sm font-semibold underline">홈</Link>
        </div>
      </header>

      <main className="flex flex-col gap-5 px-5 py-5">
        {query.message ? (
          <p className="rounded-xl bg-mint-soft px-4 py-3 text-sm" role="status">{query.message}</p>
        ) : null}
        {query.error ? (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm" role="alert">{query.error}</p>
        ) : null}

        <Card>
          <div className="flex items-center gap-2">
            <Coins className="size-5 text-primary" />
            <h2 className="font-bold">{user.name}님의 포인트</h2>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">사용 가능</dt><dd className="text-lg font-extrabold">{Number(data.balance.availablePoints).toLocaleString()}P</dd></div>
            <div><dt className="text-muted-foreground">예치 중</dt><dd className="text-lg font-extrabold">{Number(data.balance.heldPoints).toLocaleString()}P</dd></div>
          </dl>
        </Card>

        {user.role === 'ADMIN' ? (
          <Card>
            <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5" />관리자 포인트 지급</h2>
            <form action={grantAction} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
              <select name="targetUserId" required className="app-input" aria-label="지급 대상">
                <option value="">지급 대상 선택</option>
                {data.users.map((item) => <option key={item.userId} value={item.userId}>{item.name} · {item.studentId}</option>)}
              </select>
              <input name="amount" type="number" min="1" max="1000000" required className="app-input" placeholder="지급 포인트" />
              <input name="reason" required maxLength={200} className="app-input" placeholder="지급 사유" />
              <Submit>포인트 지급</Submit>
            </form>
          </Card>
        ) : null}

        <Card>
          <h2 className="flex items-center gap-2 font-bold"><Route className="size-5" />새 모집</h2>
          <p className="mt-1 text-xs text-muted-foreground">예상 요금은 지도 연동 전 결정적 입력값으로 사용합니다.</p>
          <form action={createTripAction} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
            <input name="origin" required maxLength={120} className="app-input" placeholder="출발지" />
            <input name="destination" required maxLength={120} className="app-input" placeholder="도착지" />
            <label className="text-sm font-semibold">출발 시각<input name="departureAt" type="datetime-local" required className="app-input mt-1" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm font-semibold">최대 인원<select name="maxParticipants" className="app-input mt-1"><option>2</option><option>3</option><option>4</option></select></label>
              <label className="text-sm font-semibold">예상 요금<input name="estimatedFare" type="number" min="1" max="1000000" required className="app-input mt-1" /></label>
            </div>
            <Submit>모집 만들기</Submit>
          </form>
        </Card>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Users className="size-5" />모집 목록</h2>
          <div className="flex flex-col gap-4">
            {data.trips.length ? data.trips.map((trip) => {
              const participants = data.participants.filter((item) => item.tripId === trip.tripId)
              const settlement = data.settlements.find((item) => item.tripId === trip.tripId)
              const isHost = trip.hostUserId === user.userId
              return (
                <Card key={trip.tripId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold">{trip.origin} → {trip.destination}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        방장 {trip.hostName} · {new Date(trip.departureAt).toLocaleString('ko-KR')} · {trip.approvedCount}/{trip.maxParticipants}명
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">{trip.status}</span>
                  </div>
                  <p className="mt-3 text-sm">예상 총 요금 <strong>{trip.estimatedFare.toLocaleString()}P</strong></p>

                  {isHost && trip.status === 'OPEN' ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {participants.filter((item) => item.status === 'APPLIED').map((item) => (
                        <form key={item.userId} action={approveAction} className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                          <input type="hidden" name="tripId" value={trip.tripId} />
                          <input type="hidden" name="participantId" value={item.userId} />
                          <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                          <span className="text-sm">{item.name} · 참여 신청</span>
                          <MiniSubmit>승인</MiniSubmit>
                        </form>
                      ))}
                      <form action={depositAction}>
                        <input type="hidden" name="tripId" value={trip.tripId} />
                        <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                        <Submit>모집 확정 및 전원 예치</Submit>
                      </form>
                    </div>
                  ) : null}

                  {!isHost && trip.status === 'OPEN' && !trip.currentUserStatus ? (
                    <form action={applyAction} className="mt-3">
                      <input type="hidden" name="tripId" value={trip.tripId} />
                      <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                      <Submit>참여 신청</Submit>
                    </form>
                  ) : null}
                  {!isHost && trip.currentUserStatus ? <p className="mt-3 text-sm font-semibold">내 상태: {trip.currentUserStatus}</p> : null}

                  {isHost && trip.status === 'CONFIRMED' ? (
                    <form action={submitFareAction} className="mt-3 flex gap-2">
                      <input type="hidden" name="tripId" value={trip.tripId} />
                      <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                      <input name="actualFare" type="number" min="1" max="1000000" required className="app-input" placeholder="실제 총 요금" />
                      <MiniSubmit>등록</MiniSubmit>
                    </form>
                  ) : null}

                  {settlement ? (
                    <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-sm">
                      <p>실제 요금 <strong>{settlement.actualFare.toLocaleString()}P</strong> · 1인 {settlement.finalShare.toLocaleString()}P</p>
                      <p className="mt-1 text-xs">확인 {settlement.confirmationCount}/{settlement.participantCount}명</p>
                      {!settlement.currentUserConfirmed && settlement.status === 'PENDING_CONFIRMATION' ? (
                        <form action={confirmFareAction} className="mt-2">
                          <input type="hidden" name="tripId" value={trip.tripId} />
                          <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                          <MiniSubmit>실제 요금 확인</MiniSubmit>
                        </form>
                      ) : null}
                      {isHost && settlement.status === 'PENDING_CONFIRMATION' ? (
                        <form action={settleAction} className="mt-2">
                          <input type="hidden" name="tripId" value={trip.tripId} />
                          <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
                          <Submit>최종 정산</Submit>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              )
            }) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">아직 모집이 없습니다.</p>}
          </div>
        </section>
      </main>
    </MobileShell>
  )
}

function Submit({ children }: { children: React.ReactNode }) {
  return <button type="submit" className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold active:scale-[0.99]">{children}</button>
}

function MiniSubmit({ children }: { children: React.ReactNode }) {
  return <button type="submit" className="shrink-0 rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background">{children}</button>
}

