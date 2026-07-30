import { MobileShell } from '@/components/mobile-shell'

export function RouteLoadingState({ label }: { label: string }) {
  return (
    <MobileShell withTabBar={false}>
      <div
        className="flex flex-1 flex-col gap-4 px-5 py-6"
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
        <div className="h-7 w-36 rounded-lg bg-muted motion-safe:animate-pulse" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-48 rounded-2xl border border-border bg-card motion-safe:animate-pulse"
          />
        ))}
      </div>
    </MobileShell>
  )
}
