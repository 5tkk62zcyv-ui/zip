'use client'

import { useCallback, useState } from 'react'
import { Calculator, Flag } from 'lucide-react'
import { arriveAndSettleAction } from '@/app/core/actions'
import { PendingSubmitButton } from '@/components/pending-submit-button'
import { Modal } from '@/components/ui/modal'

export function ArrivalSettlementControl({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const close = useCallback(() => setOpen(false), [])

  function openFareModal() {
    setIdempotencyKey(crypto.randomUUID())
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={openFareModal}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[17px] font-normal text-primary-foreground transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Flag className="size-5" aria-hidden />
        도착
      </button>

      <Modal
        open={open}
        onClose={close}
        labelledBy="arrival-settlement-title"
      >
        <div className="flex flex-col gap-4">
          <div>
            <h2 id="arrival-settlement-title" className="text-xl font-extrabold">
              실제 택시비 입력
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              실제 택시비를 탑승 인원으로 균등하게 나누어 정산합니다.
            </p>
          </div>

          <form action={arriveAndSettleAction} className="flex flex-col gap-3">
            <input type="hidden" name="tripId" value={tripId} />
            <input
              type="hidden"
              name="idempotencyKey"
              value={idempotencyKey}
            />
            <label htmlFor="arrivalActualFare" className="text-sm font-semibold">
              실제 택시비
            </label>
            <div className="relative">
              <input
                id="arrivalActualFare"
                name="actualFare"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                minLength={1}
                maxLength={7}
                autoComplete="off"
                required
                className="app-input pr-10"
                placeholder="예: 13000"
                aria-describedby="arrival-fare-help"
              />
              <span
                className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground"
                aria-hidden
              >
                원
              </span>
            </div>
            <p
              id="arrival-fare-help"
              className="text-xs text-muted-foreground"
            >
              1원 이상 숫자만 입력해 주세요. 완료된 정산은 다시 실행되지 않습니다.
            </p>
            <PendingSubmitButton
              pendingLabel="정산 중..."
              disabled={!idempotencyKey}
            >
              <Calculator className="size-5" aria-hidden />
              정산하기
            </PendingSubmitButton>
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-full border border-border px-5 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring"
            >
              취소
            </button>
          </form>
        </div>
      </Modal>
    </>
  )
}
