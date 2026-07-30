import { Inbox } from 'lucide-react'

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-border bg-muted px-6 py-12 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-base leading-relaxed text-muted-foreground">{label}</p>
    </div>
  )
}
