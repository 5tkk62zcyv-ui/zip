import Link from 'next/link'
import { ArrowRight, MapPin, Sparkles, ShieldCheck } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { BrandLogo, TaxiMark } from '@/components/brand-logo'

export default function OnboardingPage() {
  return (
    <MobileShell withTabBar={false} className="bg-background">
      <div className="flex flex-1 flex-col px-6 pb-8 pt-12">
        <BrandLogo size="md" />

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <TaxiMark className="size-28 rounded-[2rem] shadow-lg shadow-primary/30" />
            <span className="absolute -right-3 -top-3 flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-mint-foreground shadow">
              <Sparkles className="size-3.5" />
              AI 추천
            </span>
          </div>

          <h1 className="text-pretty text-2xl font-extrabold leading-snug">
            같은 방향이라면,
            <br />
            택시비도 함께 나눠요
          </h1>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            가까운 출발지와 비슷한 목적지의
            <br />
            동승 방을 찾아드려요.
          </p>

          <ul className="mt-8 flex w-full flex-col gap-2.5 text-left">
            <Feature icon={MapPin} text="내 주변 출발지와 가까운 방을 우선 추천" />
            <Feature icon={Sparkles} text="AI가 우회 시간까지 계산해 매칭" />
            <Feature icon={ShieldCheck} text="확정 인원 기준의 투명한 포인트 정산" />
          </ul>
        </div>

        <Link
          href="/signup"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          시작하기
          <ArrowRight className="size-5" />
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          대학생을 위한 택시 동승·비용 분담 서비스
        </p>
      </div>
    </MobileShell>
  )
}

function Feature({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-medium">{text}</span>
    </li>
  )
}
