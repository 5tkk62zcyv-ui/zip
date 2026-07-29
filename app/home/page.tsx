import { requireCompleteUser } from '@/lib/auth/session'
import { HomeClient } from './home-client'

export default async function HomePage() {
  const user = await requireCompleteUser()

  return <HomeClient name={user.name} />
}
