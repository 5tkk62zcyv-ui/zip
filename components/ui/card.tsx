import { cn } from '@/lib/utils'

export function Card({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-border bg-card p-5',
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
      className={cn('text-base font-semibold tracking-tight text-card-foreground', className)}
      {...props}
    />
  )
}
