'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/app-provider'
import { MobileShell } from '@/components/mobile-shell'
import { TopBar } from '@/components/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { adminGrants, formatPoints } from '@/lib/mock-data'
import { Gift, Search, ShieldCheck } from 'lucide-react'

interface GrantRow {
  id: string
  name: string
  studentId: string
  email: string
  amount: number
  reason: string
  date: string
}

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useApp()

  const [query, setQuery] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [grants, setGrants] = useState<GrantRow[]>(adminGrants)

  const totalGranted = grants.reduce((sum, g) => sum + g.amount, 0)

  function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!query.trim()) {
      toast('학번 또는 이메일을 입력하세요', 'warn')
      return
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      toast('유효한 포인트 금액을 입력하세요', 'warn')
      return
    }
    const now = new Date()
    const stamp = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setGrants((g) => [
      {
        id: `g${Date.now()}`,
        name: query.includes('@') ? query.split('@')[0] : '사용자',
        studentId: query.includes('@') ? '-' : query,
        email: query.includes('@') ? query : `${query}@jbnu.ac.kr`,
        amount: amt,
        reason: reason.trim() || '운영자 직접 지급',
        date: stamp,
      },
      ...g,
    ])
    toast(`${formatPoints(amt)} 지급 완료`, 'success')
    setQuery('')
    setAmount('')
    setReason('')
  }

  return (
    <MobileShell>
      <TopBar title="관리자 · 포인트 지급" onBack={() => router.push('/mypage')} />
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-4">
        <Card className="mb-5 flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">총 지급 포인트</p>
            <p className="text-lg font-bold text-foreground">{formatPoints(totalGranted)}</p>
          </div>
        </Card>

        {/* Grant form */}
        <form onSubmit={handleGrant}>
          <Card className="mb-6 flex flex-col gap-4 p-5">
            <div>
              <label htmlFor="target" className="mb-1.5 block text-sm font-medium text-foreground">
                대상 사용자
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  id="target"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="app-input pl-9"
                  placeholder="학번 또는 학교 이메일"
                />
              </div>
            </div>
            <div>
              <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-foreground">
                지급 포인트
              </label>
              <input
                id="amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                className="app-input"
                placeholder="예: 30000"
              />
            </div>
            <div>
              <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-foreground">
                지급 사유 (선택)
              </label>
              <input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="app-input"
                placeholder="예: 신규 사용자 지급"
              />
            </div>
            <Button type="submit" className="h-12 w-full gap-2 rounded-xl text-base font-semibold">
              <Gift className="size-5" aria-hidden />
              포인트 지급
            </Button>
          </Card>
        </form>

        {/* Grant history */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">지급 내역</h2>
          <span className="text-xs text-muted-foreground">{grants.length}건</span>
        </div>
        <div className="flex flex-col gap-2">
          {grants.map((g) => (
            <Card key={g.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {g.name} · {g.studentId}
                </p>
                <p className="truncate text-xs text-muted-foreground">{g.reason}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{g.date}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-mint">+{formatPoints(g.amount)}</span>
            </Card>
          ))}
        </div>
      </div>
    </MobileShell>
  )
}
