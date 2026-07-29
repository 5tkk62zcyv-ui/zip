// Mock data & domain types for the 택시타쉐어 prototype.
// Structured so it can later map cleanly to a Next.js + Neon DB backend.

export type Gender = 'female' | 'male' | 'none'
export type RoomStatus = 'recruiting' | 'closed' | 'gathering' | 'settling' | 'settled'
export type MemberRole = 'host' | 'member'
export type ApprovalMode = 'auto' | 'host'

export interface RoomMember {
  id: string
  /** 개인정보 보호를 위해 일부만 노출 (예: "민지", "준*") */
  displayName: string
  role: MemberRole
  checkedIn: boolean
}

export interface RecommendReason {
  fromOriginMeters: number
  toDestMeters: number
  detourMinutes: number
}

export interface Room {
  id: string
  origin: string
  destination: string
  /** 사람이 읽는 출발 시각, 예: "오늘 22:30" */
  departLabel: string
  /** 출발까지 남은 분 (목업) */
  minutesUntilDepart: number
  maxSeats: number
  members: RoomMember[]
  status: RoomStatus
  /** 예상 1인 분담 포인트 */
  perPersonPoints: number
  /** 예상 총 택시비(원) */
  estimatedFare: number
  distanceKm: number
  durationMin: number
  approval: ApprovalMode
  allowNearby: boolean
  reason: RecommendReason
}

export interface PointTx {
  id: string
  label: string
  amount: number
  date: string
}

export interface CurrentUser {
  name: string
  studentId: string
  gender: Gender
  email: string
  points: number
  deposited: number
}

export const currentUser: CurrentUser = {
  name: '민지',
  studentId: '20213456',
  gender: 'female',
  email: 'minji@jbnu.ac.kr',
  points: 24000,
  deposited: 0,
}

const avatarColors = ['bg-primary', 'bg-mint', 'bg-info', 'bg-accent']
export function avatarColor(index: number) {
  return avatarColors[index % avatarColors.length]
}

export const recommendedRooms: Room[] = [
  {
    id: 'room-1',
    origin: '전북대학교',
    destination: '전주역',
    departLabel: '오늘 22:30',
    minutesUntilDepart: 12,
    maxSeats: 4,
    status: 'recruiting',
    perPersonPoints: 4500,
    estimatedFare: 12000,
    distanceKm: 7.8,
    durationMin: 20,
    approval: 'auto',
    allowNearby: true,
    members: [
      { id: 'u1', displayName: '민지', role: 'host', checkedIn: false },
      { id: 'u2', displayName: '준호', role: 'member', checkedIn: false },
    ],
    reason: { fromOriginMeters: 120, toDestMeters: 230, detourMinutes: 3 },
  },
  {
    id: 'room-2',
    origin: '전북대학교',
    destination: '전주역',
    departLabel: '오늘 23:10',
    minutesUntilDepart: 52,
    maxSeats: 4,
    status: 'recruiting',
    perPersonPoints: 6200,
    estimatedFare: 12400,
    distanceKm: 8.1,
    durationMin: 22,
    approval: 'host',
    allowNearby: false,
    members: [
      { id: 'u3', displayName: '서연', role: 'host', checkedIn: false },
      { id: 'u4', displayName: '도윤', role: 'member', checkedIn: false },
      { id: 'u5', displayName: '하은', role: 'member', checkedIn: false },
    ],
    reason: { fromOriginMeters: 260, toDestMeters: 150, detourMinutes: 5 },
  },
  {
    id: 'room-3',
    origin: '전북대학교',
    destination: '전주역',
    departLabel: '오늘 21:50',
    minutesUntilDepart: 8,
    maxSeats: 4,
    status: 'recruiting',
    perPersonPoints: 3800,
    estimatedFare: 11400,
    distanceKm: 7.5,
    durationMin: 19,
    approval: 'auto',
    allowNearby: true,
    members: [{ id: 'u6', displayName: '지우', role: 'host', checkedIn: false }],
    reason: { fromOriginMeters: 340, toDestMeters: 420, detourMinutes: 6 },
  },
]

export const myRooms = {
  hosted: [recommendedRooms[0]],
  joined: [recommendedRooms[1]],
}

export const pointHistory: PointTx[] = [
  { id: 't1', label: '관리자 지급', amount: 30000, date: '2026.07.20' },
  { id: 't2', label: '방 참여 예치', amount: -4000, date: '2026.07.22' },
  { id: 't3', label: '정산 차액 반환', amount: 1000, date: '2026.07.22' },
]

export const adminGrants = [
  { id: 'g1', name: '민지', studentId: '20213456', email: 'minji@jbnu.ac.kr', amount: 30000, reason: '신규 사용자 지급', date: '07.20 14:22' },
  { id: 'g2', name: '준호', studentId: '20198765', email: 'junho@jbnu.ac.kr', amount: 10000, reason: '테스트 참여 보상', date: '07.21 10:05' },
  { id: 'g3', name: '서연', studentId: '20221122', email: 'seoyeon@jbnu.ac.kr', amount: 5000, reason: '운영자 직접 지급', date: '07.21 18:40' },
]

export function formatPoints(n: number) {
  return `${n.toLocaleString('ko-KR')}P`
}

export function formatWon(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}

export function getRoomById(id: string): Room | undefined {
  return recommendedRooms.find((r) => r.id === id)
}
