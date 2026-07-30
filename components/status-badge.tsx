import { cn } from '@/lib/utils'

type Tone = 'brand' | 'mint' | 'info' | 'warn' | 'muted'

const toneStyles: Record<Tone, string> = {
  brand: 'bg-primary/10 text-primary',
  mint: 'bg-mint-soft text-foreground',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  muted: 'bg-muted text-muted-foreground',
}
const toneLabels: Record<Tone, string> = {
  brand: '주요 상태',
  mint: '완료 상태',
  info: '안내 상태',
  warn: '주의 상태',
  muted: '일반 상태',
}

export function StatusBadge({
  children,
  tone = 'muted',
  className,
  icon: Icon,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1 rounded-full border border-current/10 px-2.5 py-1 text-xs font-semibold',
        toneStyles[tone],
        className,
      )}
    >
      <span className="sr-only">{toneLabels[tone]}: </span>
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </span>
  )
}
