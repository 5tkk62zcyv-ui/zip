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

export function AppProvider({
  children,
  authenticatedUser,
}: {
  children: ReactNode
  authenticatedUser?: Pick<
    CurrentUser,
    'name' | 'studentId' | 'gender' | 'email'
  > | null
}) {
  const [user] = useState<CurrentUser>(() => ({
    ...initialUser,
    ...(authenticatedUser ?? {}),
    ...(authenticatedUser ? { points: 0, deposited: 0 } : {}),
  }))
  const [rooms, setRooms] = useState<Room[]>(recommendedRooms)
  const [history, setHistory] = useState<PointTx[]>(
    authenticatedUser ? [] : initialHistory,
  )
  const [joinedRoomIds] = useState<string[]>([])
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
    (_room: Room) => {
      toast(
        '포인트 예치는 서버 원장 기능이 준비될 때까지 사용할 수 없어요.',
        'warn',
      )
    },
    [toast],
  )

  const closeRoom = useCallback((roomId: string) => {
    setRooms((rs) =>
      rs.map((r) => (r.id === roomId ? { ...r, status: 'closed' } : r)),
    )
  }, [])

  const settleAdjust = useCallback(
    (_delta: number) => {
      toast(
        '최종 정산은 서버 원장 기능이 준비될 때까지 사용할 수 없어요.',
        'warn',
      )
    },
    [toast],
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
