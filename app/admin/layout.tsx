import { requireAdmin } from '@/lib/auth/session'
import { AdminNav } from '@/components/admin/admin-nav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin()
  return (
    <>
      <AdminNav />
      {children}
    </>
  )
}
