'use client'

import { useEffect } from 'react'

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] mx-auto flex w-full max-w-[430px] items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 animate-in fade-in"
      />
      <div className="relative m-4 w-full rounded-3xl bg-card p-5 shadow-xl animate-in slide-in-from-bottom-4">
        {children}
      </div>
    </div>
  )
}
