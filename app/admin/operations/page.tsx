import { AdminReadPage } from '@/components/admin/admin-read-page'
import { Card } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminOperationsDashboard } from '@/lib/admin/service'

export default async function AdminOperationsPage() {
  const admin = await requireAdmin()
  const data = await getAdminOperationsDashboard(admin.userId)
  return (
    <AdminReadPage
      title="방 운영"
      description="실제 진행 중인 방의 최소 상태만 표시합니다. CONFIRMED 이후 강제 변경은 제공하지 않습니다."
    >
      {data.recentTrips.map((trip) => (
        <Card key={trip.tripId} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">방 {trip.tripId.slice(0, 8)}</span>
            <span className="text-xs font-bold">{trip.status}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            인원 {trip.participantCount}/{trip.maxParticipants}명 ·{' '}
            {new Date(trip.departureAt).toLocaleString('ko-KR')}
          </p>
        </Card>
      ))}
      {!data.recentTrips.length ? (
        <Card className="text-sm text-muted-foreground">운영 대상 방이 없습니다.</Card>
      ) : null}
    </AdminReadPage>
  )
}
