'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TopBar({
  title,
  subtitle,
  back = true,
  onBack,
  right,
  className,
}: {
  title: string
  subtitle?: string
  back?: boolean
  onBack?: () => void
  right?: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-3 backdrop-blur',
        className,
      )}
    >
      {back ? (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.back())}
          aria-label="뒤로가기"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <span className="w-1" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
    </header>
  )
}
