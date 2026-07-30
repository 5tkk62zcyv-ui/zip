import { AdminReadPage } from '@/components/admin/admin-read-page'
import { Card } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminUsers } from '@/lib/admin/service'

export default async function AdminUsersPage() {
  const admin = await requireAdmin()
  const users = await getAdminUsers(admin.userId)
  return (
    <AdminReadPage
      title="사용자·역할"
      description="학교 이메일과 이름은 일괄 노출하지 않고 마스킹 학번, 역할, 제한 상태와 포인트만 표시합니다."
    >
      {users.map((user) => (
        <Card key={user.userId} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">{mask(user.studentId)}</span>
            <span className="text-xs font-bold">
              {user.role} · {user.accountStatus}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            사용 가능 {Number(user.availablePoints).toLocaleString('ko-KR')}P ·
            예치 {Number(user.heldPoints).toLocaleString('ko-KR')}P
          </p>
        </Card>
      ))}
    </AdminReadPage>
  )
}

function mask(value: string) {
  return `${value.slice(0, 4)}*****`
}
