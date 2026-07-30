'use client'

import { CircleAlert, RotateCcw } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'

export function RouteErrorState({
  title,
  reset,
}: {
  title: string
  reset: () => void
}) {
  return (
    <MobileShell withTabBar={false}>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full rounded-2xl border border-warn/30 bg-warn-soft p-6 text-center">
          <CircleAlert className="mx-auto size-7 text-warn" aria-hidden />
          <h1 className="mt-3 text-lg font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            잠시 후 다시 시도해 주세요. 계속되면 관리자에게 문의해 주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background"
          >
            <RotateCcw className="size-4" aria-hidden />
            다시 시도
          </button>
        </div>
      </main>
    </MobileShell>
  )
}
