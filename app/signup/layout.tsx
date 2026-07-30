import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

export default async function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (await getCurrentUser()) redirect('/home')
  return children
}
