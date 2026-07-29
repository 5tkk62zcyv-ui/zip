import { Inbox } from 'lucide-react'

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
