import { cn } from '@/lib/utils'

/** 노란 택시 모티프 아이콘 (라인 스타일 + 채움) */
export function TaxiMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-2xl bg-primary text-primary-foreground',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[58%]"
      >
        <path d="M10 4h4l1.2 2.2H8.8L10 4Z" />
        <path d="M4.5 12.2c.4-1.9.9-3.4 1.5-4.4.4-.7 1-1 1.8-1h8.4c.8 0 1.4.3 1.8 1 .6 1 1.1 2.5 1.5 4.4" />
        <rect x="4" y="12" width="16" height="6" rx="1.6" />
        <circle cx="8" cy="18.6" r="1.4" fill="currentColor" />
        <circle cx="16" cy="18.6" r="1.4" fill="currentColor" />
        <path d="M12 8v3" />
      </svg>
    </span>
  )
}

export function BrandLogo({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const markSize =
    size === 'lg' ? 'size-11' : size === 'sm' ? 'size-7' : 'size-9'
  const textSize =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <TaxiMark className={markSize} />
      <span className={cn('font-gothic font-extrabold tracking-tight', textSize)}>
        택시타쉐어
      </span>
    </span>
  )
}
