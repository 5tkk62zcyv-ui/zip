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
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px]">
      <div
        className={cn(
          'border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur',
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
    mint: 'bg-mint text-mint-foreground',
    outline: 'border border-border bg-background text-foreground',
  }
  return (
    <button
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
