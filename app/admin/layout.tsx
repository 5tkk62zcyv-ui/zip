import { requireAdmin } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin()
  return children
}
