import { requireCompleteUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function HomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireCompleteUser()
  return children
}
