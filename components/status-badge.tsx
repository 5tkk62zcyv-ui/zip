import { cn } from '@/lib/utils'

type Tone = 'brand' | 'mint' | 'info' | 'warn' | 'muted'

const toneStyles: Record<Tone, string> = {
  brand: 'bg-primary/20 text-foreground',
  mint: 'bg-mint-soft text-mint',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        toneStyles[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </span>
  )
}
