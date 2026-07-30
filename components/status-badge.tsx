import { cn } from '@/lib/utils'

type Tone = 'brand' | 'mint' | 'info' | 'warn' | 'muted'

const toneStyles: Record<Tone, string> = {
  brand: 'bg-primary/10 text-primary',
  mint: 'bg-mint-soft text-foreground',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  muted: 'bg-muted text-muted-foreground',
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
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </span>
  )
}
