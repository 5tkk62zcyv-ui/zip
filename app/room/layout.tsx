import { requireCompleteUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function RoomLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireCompleteUser()
  return children
}
