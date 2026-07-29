'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  currentUser as initialUser,
  recommendedRooms,
  pointHistory as initialHistory,
  type CurrentUser,
  type PointTx,
  type Room,
} from '@/lib/mock-data'
import { Toaster } from '@/components/ui/toast'

interface AppState {
  user: CurrentUser
  rooms: Room[]
  history: PointTx[]
  joinedRoomIds: string[]
  toast: (message: string, tone?: 'default' | 'success' | 'warn') => void
  depositAndJoin: (room: Room) => void
  closeRoom: (roomId: string) => void
  addHistory: (tx: Omit<PointTx, 'id' | 'date'>) => void
  settleAdjust: (delta: number) => void
}

const AppContext = createContext<AppState | null>(null)

let txCounter = 100

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(initialUser)
  const [rooms, setRooms] = useState<Room[]>(recommendedRooms)
  const [history, setHistory] = useState<PointTx[]>(initialHistory)
  const [joinedRoomIds, setJoinedRoomIds] = useState<string[]>([])
  const [toasts, setToasts] = useState<
    { id: number; message: string; tone: 'default' | 'success' | 'warn' }[]
  >([])

  const toast = useCallback(
    (message: string, tone: 'default' | 'success' | 'warn' = 'default') => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, message, tone }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
    },
    [],
  )

  const addHistory = useCallback((tx: Omit<PointTx, 'id' | 'date'>) => {
    setHistory((h) => [
      { ...tx, id: `t${txCounter++}`, date: '2026.07.29' },
      ...h,
    ])
  }, [])

  const depositAndJoin = useCallback(
    (room: Room) => {
      setUser((u) => ({
        ...u,
        points: u.points - room.perPersonPoints,
        deposited: u.deposited + room.perPersonPoints,
      }))
      setJoinedRoomIds((ids) =>
        ids.includes(room.id) ? ids : [...ids, room.id],
      )
      addHistory({ label: '방 참여 예치', amount: -room.perPersonPoints })
    },
    [addHistory],
  )

  const closeRoom = useCallback((roomId: string) => {
    setRooms((rs) =>
      rs.map((r) => (r.id === roomId ? { ...r, status: 'closed' } : r)),
    )
  }, [])

  const settleAdjust = useCallback(
    (delta: number) => {
      // delta > 0: 추가 차감, delta < 0: 반환
      setUser((u) => ({
        ...u,
        points: u.points - Math.max(delta, 0) + Math.max(-delta, 0),
        deposited: 0,
      }))
      addHistory({
        label: delta >= 0 ? '최종 정산 추가 차감' : '정산 차액 반환',
        amount: -delta,
      })
    },
    [addHistory],
  )

  const value = useMemo(
    () => ({
      user,
      rooms,
      history,
      joinedRoomIds,
      toast,
      depositAndJoin,
      closeRoom,
      addHistory,
      settleAdjust,
    }),
    [user, rooms, history, joinedRoomIds, toast, depositAndJoin, closeRoom, addHistory, settleAdjust],
  )

  return (
    <AppContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} />
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
