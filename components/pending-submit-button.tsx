'use client'

import { useFormStatus } from 'react-dom'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PendingSubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
}: {
  children: React.ReactNode
  pendingLabel: string
  className?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className={cn(
        'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        className,
      )}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
