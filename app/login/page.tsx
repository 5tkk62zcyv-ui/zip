import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/home')
  return (
    <MobileShell withTabBar={false}>
      <TopBar title="로그인" subtitle="가입한 학번과 이름을 입력해 주세요" backHref="/" />
      <LoginForm />
    </MobileShell>
  )
}
