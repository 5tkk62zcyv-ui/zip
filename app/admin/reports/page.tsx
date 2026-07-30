import {
  AdminReadPage,
  DeferredAdminAction,
} from '@/components/admin/admin-read-page'

export default function AdminReportsPage() {
  return (
    <AdminReadPage
      title="신고·이용 제한"
      description="신고·차단 스키마와 보복 방지 노출 정책이 아직 확정되지 않아 가짜 신고 데이터를 만들지 않습니다."
    >
      <DeferredAdminAction label="접수된 신고가 없습니다." />
    </AdminReadPage>
  )
}
