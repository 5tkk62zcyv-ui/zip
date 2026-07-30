import { Gift, ShieldCheck } from 'lucide-react'
import {
  fulfillPointRequestAction,
  grantPointsAction,
} from '@/app/core/actions'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAdminPointDashboard } from '@/lib/core/service'

function formatPoints(value: number) {
  return `${Number(value).toLocaleString('ko-KR')}P`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const [{ message, error }, data] = await Promise.all([
    searchParams,
    getAdminPointDashboard(),
  ])

  return (
    <MobileShell>
      <TopBar title="관리자 · 포인트 지급" backHref="/home" />
      <main className="flex-1 overflow-y-auto px-5 pb-10 pt-4">
        {message ? (
          <p
            role="status"
            className="mb-4 rounded-xl bg-mint-soft px-4 py-3 text-sm font-semibold text-foreground"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-foreground"
          >
            {error}
          </p>
        ) : null}

        <Card className="mb-5 flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">누적 지급 포인트</p>
            <p className="text-lg font-bold text-foreground">
              {formatPoints(data.totalGranted)}
            </p>
          </div>
        </Card>

        <form action={grantPointsAction}>
          <Card className="mb-7 flex flex-col gap-4 p-5">
            <h2 className="text-sm font-bold">직접 지급</h2>
            <input
              type="hidden"
              name="idempotencyKey"
              value={crypto.randomUUID()}
            />
            <div>
              <label
                htmlFor="targetUserId"
                className="mb-1.5 block text-sm font-medium"
              >
                대상 사용자
              </label>
              <select
                id="targetUserId"
                name="targetUserId"
                className="app-input"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  사용자를 선택하세요
                </option>
                {data.users.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name} · {user.studentId} · {user.schoolEmail}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="amount" className="mb-1.5 block text-sm font-medium">
                지급 포인트
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={1_000_000}
                step={1}
                className="app-input"
                placeholder="예: 30000"
                required
              />
            </div>
            <div>
              <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">
                지급 사유
              </label>
              <input
                id="reason"
                name="reason"
                minLength={1}
                maxLength={200}
                className="app-input"
                placeholder="예: 정산 부족분 지원"
                required
              />
            </div>
            <Button
              type="submit"
              className="h-12 w-full gap-2 rounded-xl text-base font-semibold"
            >
              <Gift className="size-5" aria-hidden />
              포인트 지급
            </Button>
          </Card>
        </form>

        <section className="mb-7" aria-labelledby="pending-request-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="pending-request-heading" className="text-sm font-bold">
              대기 중 지급 요청
            </h2>
            <span className="text-xs text-muted-foreground">
              {data.pendingRequests.length}건
            </span>
          </div>
          {data.pendingRequests.length ? (
            <div className="flex flex-col gap-3">
              {data.pendingRequests.map((request) => (
                <Card key={request.requestId} className="p-4">
                  <p className="text-sm font-semibold">
                    {request.name} · {request.studentId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.reason}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-primary">
                        {formatPoints(request.requestedAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.requestedAt)}
                      </p>
                    </div>
                    <form action={fulfillPointRequestAction}>
                      <input
                        type="hidden"
                        name="requestId"
                        value={request.requestId}
                      />
                      <Button type="submit" className="min-h-11 px-4">
                        승인·지급
                      </Button>
                    </form>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 text-sm text-muted-foreground">
              대기 중인 포인트 지급 요청이 없습니다.
            </Card>
          )}
        </section>

        <section aria-labelledby="grant-history-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="grant-history-heading" className="text-sm font-bold">
              지급 원장
            </h2>
            <span className="text-xs text-muted-foreground">
              최근 {data.grants.length}건
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {data.grants.map((grant) => (
              <Card
                key={grant.ledgerId}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {grant.targetName} · {grant.targetStudentId}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {grant.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    관리자 {grant.adminName} · {formatDate(grant.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-mint">
                  +{formatPoints(grant.amount)}
                </span>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </MobileShell>
  )
}
