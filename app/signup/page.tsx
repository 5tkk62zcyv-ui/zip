'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Info } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { useApp } from '@/components/app-provider'
import { cn } from '@/lib/utils'

const genders = [
  { value: 'female', label: '여성' },
  { value: 'male', label: '남성' },
  { value: 'none', label: '선택 안 함' },
]

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useApp()
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [email, setEmail] = useState('')
  const [agree, setAgree] = useState(false)

  const canSubmit = studentId && name && email && agree

  function handleSubmit() {
    if (!canSubmit) return
    toast('가입이 완료되었어요. 환영해요!', 'success')
    router.push('/home')
  }

  return (
    <MobileShell withTabBar={false} className="bg-background">
      <TopBar title="회원가입" subtitle="택시타쉐어 이용을 위한 기본 정보" />

      <div className="flex flex-1 flex-col gap-5 px-5 py-6 pb-32">
        <Field label="학번">
          <input
            inputMode="numeric"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="예: 20213456"
            className="app-input"
          />
        </Field>

        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력해주세요"
            className="app-input"
          />
        </Field>

        <Field label="성별">
          <div className="grid grid-cols-3 gap-2">
            {genders.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGender(g.value)}
                className={cn(
                  'rounded-xl border py-3 text-sm font-semibold transition-colors',
                  gender === g.value
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="학교 이메일">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="예: minji@jbnu.ac.kr"
            className="app-input"
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            학교 이메일은 소속 정보 확인을 위해 입력받으며, 별도의 인증 절차는
            없어요.
          </p>
        </Field>

        <button
          type="button"
          onClick={() => setAgree((a) => !a)}
          className="mt-1 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
        >
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
              agree
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background',
            )}
          >
            {agree ? <Check className="size-4" /> : null}
          </span>
          <span className="text-sm font-medium">
            개인정보 수집·이용에 동의합니다.
          </span>
        </button>
      </div>

      <BottomBar>
        <BigButton onClick={handleSubmit} disabled={!canSubmit}>
          가입하고 시작하기
        </BigButton>
      </BottomBar>
    </MobileShell>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">{label}</label>
      {children}
    </div>
  )
}
