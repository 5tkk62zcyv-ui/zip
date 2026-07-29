import { cn } from '@/lib/utils'

export function Card({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('text-sm font-bold text-card-foreground', className)}
      {...props}
    />
  )
}
