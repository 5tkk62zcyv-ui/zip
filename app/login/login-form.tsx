'use client'

import { useActionState } from 'react'
import { BottomBar, BigButton } from '@/components/bottom-bar'
import { loginAction, type LoginState } from './actions'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState)

  return (
    <form action={action} className="flex flex-1 flex-col">
      <fieldset disabled={pending} className="flex flex-1 flex-col gap-6 px-5 py-8 pb-32 disabled:opacity-70">
        <Field id="studentId" label="학번" error={state.fieldErrors?.studentId?.[0]}>
          <input id="studentId" name="studentId" inputMode="numeric" pattern="[0-9]{9}" required minLength={9} maxLength={9} autoComplete="username" aria-invalid={Boolean(state.fieldErrors?.studentId)} aria-describedby={state.fieldErrors?.studentId ? 'studentId-error' : undefined} className="app-input" placeholder="숫자 9자리" />
        </Field>
        <Field id="name" label="이름" error={state.fieldErrors?.name?.[0]}>
          <input id="name" name="name" required maxLength={80} autoComplete="name" aria-invalid={Boolean(state.fieldErrors?.name)} aria-describedby={state.fieldErrors?.name ? 'name-error' : undefined} className="app-input" placeholder="가입할 때 입력한 이름" />
        </Field>
        <p className="rounded-[18px] bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
          학번과 이름은 비밀정보가 아니므로 강한 인증 방식이 아닙니다. 현재 대학 파일럿을 위한 MVP 임시 로그인입니다.
        </p>
        <p className="min-h-6 text-sm text-destructive" role="alert" aria-live="polite">
          {pending ? '로그인 정보를 확인하고 있습니다.' : state.message}
        </p>
      </fieldset>
      <BottomBar><BigButton type="submit" disabled={pending}>{pending ? '로그인 중…' : '로그인'}</BigButton></BottomBar>
    </form>
  )
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <div>
    <label htmlFor={id} className="mb-2 block text-[17px] font-semibold">{label}</label>
    {children}
    {error ? <p id={`${id}-error`} className="mt-2 text-sm text-destructive" role="alert">{error}</p> : null}
  </div>
}
