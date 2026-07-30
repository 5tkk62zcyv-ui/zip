import { cn } from '@/lib/utils'

/** 화면 하단에 고정되는 CTA 영역 (모바일 프레임 폭 기준) */
export function BottomBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[1068px]">
      <div
        className={cn(
          'border-t border-border/80 bg-background/80 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur-xl backdrop-saturate-150',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function BigButton({
  className,
  tone = 'primary',
  ...props
}: React.ComponentProps<'button'> & {
  tone?: 'primary' | 'foreground' | 'warn' | 'mint' | 'outline'
}) {
  const tones = {
    primary: 'bg-primary text-primary-foreground',
    foreground: 'bg-foreground text-background',
    warn: 'bg-warn text-warn-foreground',
    mint: 'bg-primary text-primary-foreground',
    outline: 'border border-border bg-background text-foreground',
  }
  return (
    <button
      className={cn(
        'flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[17px] font-normal transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:active:scale-100',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
