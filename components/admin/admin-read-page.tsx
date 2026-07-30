import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { Card } from '@/components/ui/card'

export function AdminReadPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <MobileShell withTabBar={false}>
      <TopBar title={title} backHref="/admin" />
      <main className="flex flex-1 flex-col gap-4 px-5 py-5">
        <Card className="border-primary/20 bg-primary/5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </Card>
        {children}
      </main>
    </MobileShell>
  )
}

export function DeferredAdminAction({ label }: { label: string }) {
  return (
    <Card className="p-4">
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        시연에서는 조회만 제공합니다. 감사 로그와 승인 정책 확정 후 변경 기능을
        연결합니다.
      </p>
    </Card>
  )
}
