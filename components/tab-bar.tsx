'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CarTaxiFront, Coins, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/my-rooms', label: '내 방', icon: CarTaxiFront },
  { href: '/points', label: '포인트', icon: Coins },
  { href: '/mypage', label: '마이', icon: User },
]

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px]"
    >
      <div className="relative border-t border-border bg-card/95 backdrop-blur">
        <ul className="flex items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
          {tabs.slice(0, 2).map((t) => (
            <TabItem key={t.href} {...t} active={pathname === t.href} />
          ))}

          {/* 가운데 강조된 방 만들기 플로팅 버튼 */}
          <li className="flex flex-1 justify-center">
            <Link
              href="/create"
              aria-label="새 동승 방 만들기"
              className="-mt-8 flex size-16 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="size-6" aria-hidden />
              <span className="text-[10px] font-bold">방 만들기</span>
            </Link>
          </li>

          {tabs.slice(2).map((t) => (
            <TabItem key={t.href} {...t} active={pathname === t.href} />
          ))}
        </ul>
      </div>
    </nav>
  )
}

function TabItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: typeof Home
  active: boolean
}) {
  return (
    <li className="flex flex-1">
      <Link
        href={href}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon
          className={cn('size-5', active && 'text-primary')}
          strokeWidth={active ? 2.4 : 1.8}
          aria-hidden
        />
        {label}
      </Link>
    </li>
  )
}
