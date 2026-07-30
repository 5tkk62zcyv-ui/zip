import { AdminReadPage } from '@/components/admin/admin-read-page'
import { Card } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminOperationsDashboard } from '@/lib/admin/service'

export default async function AdminSettlementsPage() {
  const admin = await requireAdmin()
  const data = await getAdminOperationsDashboard(admin.userId)
  return (
    <AdminReadPage
      title="정산 예외"
      description="정산 상태는 조회만 제공하며 관리자 화면에서 잔액이나 원장을 직접 수정하지 않습니다."
    >
      <Card>
        <p className="text-sm text-muted-foreground">참여자 확인 대기</p>
        <p className="mt-1 text-2xl font-extrabold">
          {Number(data.queues.pendingSettlements)}건
        </p>
      </Card>
      <Card>
        <p className="text-sm text-muted-foreground">열린 이의제기</p>
        <p className="mt-1 text-2xl font-extrabold">
          {Number(data.queues.openDisputes)}건
        </p>
      </Card>
    </AdminReadPage>
  )
}
