import { MapPin, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 실제 지도 API 대신 사용하는 스타일 목업 지도.
 * 도로 격자 + 출발/도착 핀 + 점선 경로를 표현한다.
 */
export function RouteMap({
  origin,
  destination,
  className,
}: {
  origin: string
  destination: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-secondary/40',
        className,
      )}
    >
      <svg
        viewBox="0 0 320 180"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* 배경 도로 격자 */}
        <g stroke="var(--border)" strokeWidth="10" opacity="0.6">
          <line x1="0" y1="45" x2="320" y2="45" />
          <line x1="0" y1="120" x2="320" y2="120" />
          <line x1="80" y1="0" x2="80" y2="180" />
          <line x1="220" y1="0" x2="220" y2="180" />
        </g>
        <g stroke="var(--muted)" strokeWidth="3" opacity="0.9">
          <line x1="0" y1="80" x2="320" y2="80" />
          <line x1="150" y1="0" x2="150" y2="180" />
        </g>

        {/* 경로 (점선) */}
        <path
          d="M60 135 C 110 120, 120 70, 175 60 S 250 45, 270 40"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="2 9"
        />
      </svg>

      {/* 출발 핀 */}
      <div className="absolute bottom-6 left-4 flex items-center gap-1.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-info text-info-foreground shadow">
          <MapPin className="size-4" />
        </span>
        <span className="rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-bold shadow-sm">
          {origin}
        </span>
      </div>

      {/* 도착 핀 */}
      <div className="absolute right-4 top-5 flex items-center gap-1.5">
        <span className="rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-bold shadow-sm">
          {destination}
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-warn text-warn-foreground shadow">
          <Flag className="size-4" />
        </span>
      </div>
    </div>
  )
}
