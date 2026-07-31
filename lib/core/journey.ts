export const JOURNEY_SETTLEMENT_STATUSES = [
  'DEPOSITED',
  'CHECKED_IN',
  'NO_SHOW',
] as const

export function calculateDemoFinalShare(
  actualFare: number,
  escrowParticipantCount: number,
) {
  if (
    !Number.isInteger(actualFare) ||
    actualFare <= 0 ||
    !Number.isInteger(escrowParticipantCount) ||
    escrowParticipantCount < 2 ||
    escrowParticipantCount > 4
  ) {
    throw new Error('INVALID_DEMO_SETTLEMENT_INPUT')
  }
  return Math.ceil(actualFare / escrowParticipantCount)
}
