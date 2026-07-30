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
        'sticky top-0 z-30 flex min-h-[52px] items-center gap-2 border-b border-border/80 bg-background/80 px-4 py-2 backdrop-blur-xl backdrop-saturate-150',
        className,
      )}
    >
      {back ? (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.back())}
          aria-label="뒤로가기"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <span className="w-1" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
    </header>
  )
}
