import Link from 'next/link'
import { Activity, AlertTriangle, Coins, Route, ShieldCheck } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { Card } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminOperationsDashboard } from '@/lib/admin/service'

export default async function AdminDashboardPage() {
  const admin = await requireAdmin()
  const data = await getAdminOperationsDashboard(admin.userId)
  const count = (status: string) =>
    Number(data.tripCounts.find((item) => item.status === status)?.count ?? 0)

  return (
    <MobileShell withTabBar={false}>
      <TopBar title="관리자 운영 대시보드" backHref="/home" />
      <main className="flex flex-1 flex-col gap-5 px-5 py-5">
        <Card className="flex items-center gap-3 border-primary/30 bg-primary/5">
          <ShieldCheck className="size-6 text-primary" aria-hidden />
          <div>
            <p className="text-xs text-muted-foreground">현재 관리자</p>
            <p className="font-bold">{admin.name}</p>
          </div>
        </Card>
        <section className="grid grid-cols-2 gap-3" aria-label="방 상태 요약">
          {[
            ['OPEN', '모집 중'],
            ['CLOSED', '모집 종료'],
            ['CONFIRMED', '출발 확정'],
            ['IN_PROGRESS', '이동 중'],
            ['SETTLEMENT_PENDING', '정산 대기'],
          ].map(([status, label]) => (
            <Card key={status} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-extrabold">{count(status)}건</p>
            </Card>
          ))}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-extrabold">처리 대기</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <QueueLink
              href="/admin/points"
              icon={Coins}
              label="포인트 요청"
              count={data.queues.pointRequests}
            />
            <QueueLink
              href="/admin/settlements"
              icon={Route}
              label="정산 확인"
              count={data.queues.pendingSettlements}
            />
            <QueueLink
              href="/admin/settlements"
              icon={AlertTriangle}
              label="열린 이의"
              count={data.queues.openDisputes}
            />
          </div>
        </section>
        <Card>
          <h2 className="flex items-center gap-2 font-bold">
            <Activity className="size-5" aria-hidden />
            운영 범위
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            이번 시연에서는 포인트 지급과 실제 상태 조회가 동작합니다. 신고 조치,
            역할 변경, 운영 취소와 분쟁 판정은 정책·감사 스키마 확정 후 제공합니다.
          </p>
        </Card>
      </main>
    </MobileShell>
  )
}

function QueueLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string
  icon: typeof Coins
  label: string
  count: number
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 p-4">
        <Icon className="size-5 text-primary" aria-hidden />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-extrabold">{Number(count)}건</p>
        </div>
      </Card>
    </Link>
  )
}
