import Link from 'next/link'

const items = [
  ['/admin', '대시보드'],
  ['/admin/points', '포인트'],
  ['/admin/reports', '신고'],
  ['/admin/operations', '방 운영'],
  ['/admin/settlements', '정산 예외'],
  ['/admin/users', '사용자'],
  ['/admin/release', '출시 점검'],
  ['/admin/audit', '감사 로그'],
] as const

export function AdminNav() {
  return (
    <nav
      aria-label="관리자 메뉴"
      className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3"
    >
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="min-h-10 shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
