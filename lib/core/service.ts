import 'server-only'

import { Pool, type PoolClient } from '@neondatabase/serverless'
import { ensureDatabaseIdentity, getDatabase, getDatabaseUrl } from '@/lib/db/client'

const MAX_POINTS = 1_000_000

export class CoreError extends Error {}

type TripRow = {
  tripId: string
  hostUserId: string
  hostName: string
  origin: string
  destination: string
  departureAt: string
  maxParticipants: number
  estimatedFare: number
  status: string
  approvedCount: number
  currentUserStatus: string | null
}

export async function getCoreDashboard(userId: string, isAdmin: boolean) {
  await ensureDatabaseIdentity()
  const sql = getDatabase()
  const [balanceRows, tripRows, participantRows, settlementRows, users] =
    await Promise.all([
      sql`
        SELECT available_points AS "availablePoints", held_points AS "heldPoints"
        FROM point_balances WHERE user_id = ${userId}
      `,
      sql`
        SELECT
          g.trip_id AS "tripId",
          g.host_user_id AS "hostUserId",
          host.name AS "hostName",
          g.origin,
          g.destination,
          g.departure_at AS "departureAt",
          g.max_participants AS "maxParticipants",
          g.estimated_fare AS "estimatedFare",
          g.status,
          count(p.user_id) FILTER (
            WHERE p.status IN ('APPROVED', 'DEPOSITED', 'COMPLETED')
          )::int AS "approvedCount",
          mine.status AS "currentUserStatus"
        FROM trip_groups g
        JOIN users host ON host.user_id = g.host_user_id
        LEFT JOIN trip_participants p ON p.trip_id = g.trip_id
        LEFT JOIN trip_participants mine
          ON mine.trip_id = g.trip_id AND mine.user_id = ${userId}
        WHERE g.status <> 'EXPIRED'
        GROUP BY g.trip_id, host.name, mine.status
        ORDER BY g.created_at DESC
      `,
      sql`
        SELECT
          p.trip_id AS "tripId",
          p.user_id AS "userId",
          u.name,
          u.student_id AS "studentId",
          p.role,
          p.status
        FROM trip_participants p
        JOIN users u ON u.user_id = p.user_id
        JOIN trip_groups g ON g.trip_id = p.trip_id
        WHERE g.host_user_id = ${userId} OR p.user_id = ${userId}
        ORDER BY p.applied_at
      `,
      sql`
        SELECT
          s.trip_id AS "tripId",
          s.actual_fare AS "actualFare",
          s.final_share AS "finalShare",
          s.status,
          count(c.user_id)::int AS "confirmationCount",
          s.participant_count AS "participantCount",
          bool_or(c.user_id = ${userId}) AS "currentUserConfirmed"
        FROM trip_settlements s
        LEFT JOIN fare_confirmations c ON c.trip_id = s.trip_id
        JOIN trip_participants p
          ON p.trip_id = s.trip_id AND p.user_id = ${userId}
        GROUP BY s.trip_id
      `,
      isAdmin
        ? sql`
            SELECT user_id AS "userId", name, student_id AS "studentId"
            FROM users WHERE account_status = 'ACTIVE'
            ORDER BY created_at
          `
        : Promise.resolve([]),
    ])

  return {
    balance: (balanceRows[0] as
      | { availablePoints: string; heldPoints: string }
      | undefined) ?? { availablePoints: '0', heldPoints: '0' },
    trips: tripRows as unknown as TripRow[],
    participants: participantRows as unknown as Array<{
      tripId: string
      userId: string
      name: string
      studentId: string
      role: string
      status: string
    }>,
    settlements: settlementRows as unknown as Array<{
      tripId: string
      actualFare: number
      finalShare: number
      status: string
      confirmationCount: number
      participantCount: number
      currentUserConfirmed: boolean
    }>,
    users: users as unknown as Array<{
      userId: string
      name: string
      studentId: string
    }>,
  }
}

async function inTransaction<T>(run: (client: PoolClient) => Promise<T>) {
  await ensureDatabaseIdentity()
  const pool = new Pool({ connectionString: getDatabaseUrl(), max: 1 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    await client.query(`SET LOCAL lock_timeout = '5s'`)
    await client.query(`SET LOCAL statement_timeout = '15s'`)
    const result = await run(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

function positiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_POINTS) {
    throw new CoreError(`${label}은 1~${MAX_POINTS.toLocaleString()} 사이의 정수여야 합니다.`)
  }
}

export async function createTrip(input: {
  actorId: string
  origin: string
  destination: string
  departureAt: Date
  maxParticipants: number
  estimatedFare: number
  idempotencyKey: string
}) {
  const origin = input.origin.trim()
  const destination = input.destination.trim()
  if (!origin || !destination || origin.length > 120 || destination.length > 120) {
    throw new CoreError('출발지와 도착지를 1~120자로 입력해주세요.')
  }
  if (
    !Number.isInteger(input.maxParticipants) ||
    input.maxParticipants < 2 ||
    input.maxParticipants > 4
  ) {
    throw new CoreError('최대 인원은 2~4명이어야 합니다.')
  }
  positiveInteger(input.estimatedFare, '예상 요금')
  if (!Number.isFinite(input.departureAt.getTime()) || input.departureAt <= new Date()) {
    throw new CoreError('출발 시각은 현재 이후여야 합니다.')
  }

  return inTransaction(async (client) => {
    const existing = await client.query(
      `SELECT trip_id FROM trip_groups
       WHERE host_user_id = $1 AND creation_idempotency_key = $2`,
      [input.actorId, input.idempotencyKey],
    )
    if (existing.rowCount) return existing.rows[0].trip_id as string

    const created = await client.query(
      `INSERT INTO trip_groups (
         host_user_id, origin, destination, departure_at, max_participants,
         estimated_fare, creation_idempotency_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING trip_id`,
      [
        input.actorId,
        origin,
        destination,
        input.departureAt,
        input.maxParticipants,
        input.estimatedFare,
        input.idempotencyKey,
      ],
    )
    const tripId = created.rows[0].trip_id as string
    await client.query(
      `INSERT INTO trip_participants
         (trip_id, user_id, role, status, approved_at)
       VALUES ($1, $2, 'HOST', 'APPROVED', now())`,
      [tripId, input.actorId],
    )
    return tripId
  })
}

export async function applyToTrip(
  actorId: string,
  tripId: string,
  idempotencyKey: string,
) {
  await inTransaction(async (client) => {
    const trip = await client.query(
      `SELECT host_user_id, status, departure_at
       FROM trip_groups WHERE trip_id = $1 FOR UPDATE`,
      [tripId],
    )
    if (!trip.rowCount) throw new CoreError('방을 찾을 수 없습니다.')
    const row = trip.rows[0]
    if (row.host_user_id === actorId) throw new CoreError('자신의 방에는 신청할 수 없습니다.')
    if (row.status !== 'OPEN' || new Date(row.departure_at) <= new Date()) {
      throw new CoreError('모집 중인 방에만 신청할 수 있습니다.')
    }
    await client.query(
      `INSERT INTO trip_participants
         (trip_id, user_id, role, status, application_idempotency_key)
       VALUES ($1, $2, 'MEMBER', 'APPLIED', $3)
       ON CONFLICT (trip_id, user_id) DO NOTHING`,
      [tripId, actorId, idempotencyKey],
    )
  })
}

export async function approveParticipant(input: {
  actorId: string
  tripId: string
  participantId: string
  idempotencyKey: string
}) {
  await inTransaction(async (client) => {
    const trip = await client.query(
      `SELECT host_user_id, status, max_participants
       FROM trip_groups WHERE trip_id = $1 FOR UPDATE`,
      [input.tripId],
    )
    const row = trip.rows[0]
    if (!row || row.host_user_id !== input.actorId) throw new CoreError('방장만 승인할 수 있습니다.')
    if (row.status !== 'OPEN') throw new CoreError('모집 중인 방에서만 승인할 수 있습니다.')
    const count = await client.query(
      `SELECT count(*)::int AS count FROM trip_participants
       WHERE trip_id = $1 AND status IN ('APPROVED', 'DEPOSITED', 'COMPLETED')`,
      [input.tripId],
    )
    if (count.rows[0].count >= row.max_participants) throw new CoreError('최대 인원에 도달했습니다.')
    const updated = await client.query(
      `UPDATE trip_participants
       SET status = 'APPROVED', approved_at = now(), approval_idempotency_key = $4
       WHERE trip_id = $1 AND user_id = $2 AND role = 'MEMBER'
         AND status = 'APPLIED'
       RETURNING user_id`,
      [input.tripId, input.participantId, input.actorId, input.idempotencyKey],
    )
    if (!updated.rowCount) {
      const retry = await client.query(
        `SELECT 1 FROM trip_participants
         WHERE trip_id = $1 AND user_id = $2 AND approval_idempotency_key = $3`,
        [input.tripId, input.participantId, input.idempotencyKey],
      )
      if (!retry.rowCount) throw new CoreError('승인 대상을 확인해주세요.')
    }
  })
}

export async function confirmTripAndDeposit(
  actorId: string,
  tripId: string,
  idempotencyKey: string,
) {
  await inTransaction(async (client) => {
    const trip = await client.query(
      `SELECT host_user_id, status, estimated_fare, max_participants,
              confirmation_idempotency_key
       FROM trip_groups WHERE trip_id = $1 FOR UPDATE`,
      [tripId],
    )
    const row = trip.rows[0]
    if (!row || row.host_user_id !== actorId) throw new CoreError('방장만 모집을 확정할 수 있습니다.')
    if (row.status === 'CONFIRMED' && row.confirmation_idempotency_key === idempotencyKey) return
    if (row.status !== 'OPEN') throw new CoreError('모집 중인 방만 확정할 수 있습니다.')

    const participants = await client.query(
      `SELECT user_id FROM trip_participants
       WHERE trip_id = $1 AND status = 'APPROVED'
       ORDER BY user_id FOR UPDATE`,
      [tripId],
    )
    const participantCount = participants.rows.length
    if (participantCount < 2 || participantCount > row.max_participants) {
      throw new CoreError('승인된 인원이 2~최대 인원일 때만 확정할 수 있습니다.')
    }
    const userIds = participants.rows.map((item) => item.user_id as string)
    await client.query(
      `SELECT user_id FROM users WHERE user_id = ANY($1::uuid[]) ORDER BY user_id FOR UPDATE`,
      [userIds],
    )
    const deposit = Math.ceil(row.estimated_fare / participantCount)
    const balances = await client.query(
      `SELECT user_id, available_points FROM point_balances
       WHERE user_id = ANY($1::uuid[])`,
      [userIds],
    )
    if (
      balances.rowCount !== userIds.length ||
      balances.rows.some((balance) => Number(balance.available_points) < deposit)
    ) {
      throw new CoreError(`모든 확정 참여자에게 ${deposit.toLocaleString()}P 이상이 필요합니다.`)
    }

    for (const participantId of userIds) {
      await client.query(
        `INSERT INTO trip_deposits (trip_id, user_id, amount)
         VALUES ($1, $2, $3)`,
        [tripId, participantId, deposit],
      )
      await client.query(
        `INSERT INTO point_ledger (
           user_id, entry_type, available_delta, held_delta, trip_id,
           actor_user_id, reason, idempotency_key
         ) VALUES ($1, 'DEPOSIT', $2, $3, $4, $5, '예상 요금 예치', $6)`,
        [participantId, -deposit, deposit, tripId, actorId, `trip:${tripId}:deposit:${participantId}`],
      )
    }
    await client.query(
      `UPDATE trip_participants SET status = 'DEPOSITED', deposited_at = now()
       WHERE trip_id = $1 AND status = 'APPROVED'`,
      [tripId],
    )
    await client.query(
      `UPDATE trip_groups
       SET status = 'CONFIRMED', confirmation_idempotency_key = $2
       WHERE trip_id = $1`,
      [tripId, idempotencyKey],
    )
  })
}

export async function grantPoints(input: {
  adminId: string
  targetUserId: string
  amount: number
  reason: string
  idempotencyKey: string
}) {
  positiveInteger(input.amount, '지급 포인트')
  const reason = input.reason.trim()
  if (!reason || reason.length > 200) throw new CoreError('지급 사유를 1~200자로 입력해주세요.')
  await inTransaction(async (client) => {
    const admin = await client.query(
      `SELECT role FROM users WHERE user_id = $1 AND account_status = 'ACTIVE' FOR UPDATE`,
      [input.adminId],
    )
    if (admin.rows[0]?.role !== 'ADMIN') throw new CoreError('관리자만 포인트를 지급할 수 있습니다.')
    const ledgerKey = `grant:${input.adminId}:${input.idempotencyKey}`
    const existing = await client.query(
      `SELECT 1 FROM point_ledger WHERE idempotency_key = $1`,
      [ledgerKey],
    )
    if (existing.rowCount) return
    await client.query(
      `INSERT INTO point_ledger (
         user_id, entry_type, available_delta, held_delta, actor_user_id,
         reason, idempotency_key
       ) VALUES ($1, 'ADMIN_GRANT', $2, 0, $3, $4, $5)`,
      [input.targetUserId, input.amount, input.adminId, reason, ledgerKey],
    )
  })
}

export async function submitActualFare(input: {
  actorId: string
  tripId: string
  actualFare: number
  idempotencyKey: string
}) {
  positiveInteger(input.actualFare, '실제 요금')
  await inTransaction(async (client) => {
    const trip = await client.query(
      `SELECT host_user_id, status FROM trip_groups WHERE trip_id = $1 FOR UPDATE`,
      [input.tripId],
    )
    const row = trip.rows[0]
    if (!row || row.host_user_id !== input.actorId) throw new CoreError('방장만 실제 요금을 입력할 수 있습니다.')
    if (row.status !== 'CONFIRMED') throw new CoreError('예치가 완료된 방에서만 실제 요금을 입력할 수 있습니다.')
    const count = await client.query(
      `SELECT count(*)::int AS count FROM trip_participants
       WHERE trip_id = $1 AND status = 'DEPOSITED'`,
      [input.tripId],
    )
    const participantCount = count.rows[0].count as number
    await client.query(
      `INSERT INTO trip_settlements (
         trip_id, actual_fare, participant_count, final_share, submitted_by,
         fare_submission_idempotency_key
       ) VALUES ($1, $2, $3, ceil($2::numeric / $3)::integer, $4, $5)`,
      [input.tripId, input.actualFare, participantCount, input.actorId, input.idempotencyKey],
    )
    await client.query(
      `INSERT INTO fare_confirmations (trip_id, user_id, idempotency_key)
       VALUES ($1, $2, $3)`,
      [input.tripId, input.actorId, input.idempotencyKey],
    )
    await client.query(
      `UPDATE trip_groups SET status = 'SETTLEMENT_PENDING' WHERE trip_id = $1`,
      [input.tripId],
    )
  })
}

export async function confirmFare(
  actorId: string,
  tripId: string,
  idempotencyKey: string,
) {
  await inTransaction(async (client) => {
    const participant = await client.query(
      `SELECT 1 FROM trip_groups g
       JOIN trip_participants p ON p.trip_id = g.trip_id
       WHERE g.trip_id = $1 AND g.status = 'SETTLEMENT_PENDING'
         AND p.user_id = $2 AND p.status = 'DEPOSITED'
       FOR UPDATE OF g`,
      [tripId, actorId],
    )
    if (!participant.rowCount) throw new CoreError('정산 대상 참여자만 요금을 확인할 수 있습니다.')
    await client.query(
      `INSERT INTO fare_confirmations (trip_id, user_id, idempotency_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id, user_id) DO NOTHING`,
      [tripId, actorId, idempotencyKey],
    )
  })
}

export async function settleTrip(
  actorId: string,
  tripId: string,
  idempotencyKey: string,
) {
  await inTransaction(async (client) => {
    const trip = await client.query(
      `SELECT g.host_user_id, g.status, s.actual_fare, s.final_share,
              s.participant_count, s.status AS settlement_status,
              s.settlement_idempotency_key
       FROM trip_groups g JOIN trip_settlements s ON s.trip_id = g.trip_id
       WHERE g.trip_id = $1 FOR UPDATE OF g, s`,
      [tripId],
    )
    const row = trip.rows[0]
    if (!row || row.host_user_id !== actorId) throw new CoreError('방장만 최종 정산할 수 있습니다.')
    if (row.settlement_status === 'COMPLETED' && row.settlement_idempotency_key === idempotencyKey) return
    if (row.status !== 'SETTLEMENT_PENDING' || row.settlement_status !== 'PENDING_CONFIRMATION') {
      throw new CoreError('정산 대기 상태가 아닙니다.')
    }
    const confirmations = await client.query(
      `SELECT count(*)::int AS count FROM fare_confirmations WHERE trip_id = $1`,
      [tripId],
    )
    if (confirmations.rows[0].count !== row.participant_count) {
      throw new CoreError('모든 확정 참여자가 실제 요금을 확인해야 합니다.')
    }
    const deposits = await client.query(
      `SELECT user_id, amount FROM trip_deposits WHERE trip_id = $1 ORDER BY user_id FOR UPDATE`,
      [tripId],
    )
    const userIds = deposits.rows.map((item) => item.user_id as string)
    await client.query(
      `SELECT user_id FROM users WHERE user_id = ANY($1::uuid[]) ORDER BY user_id FOR UPDATE`,
      [userIds],
    )
    const extra = Math.max(0, Number(row.final_share) - Number(deposits.rows[0]?.amount ?? 0))
    if (extra > 0) {
      const balances = await client.query(
        `SELECT user_id, available_points FROM point_balances
         WHERE user_id = ANY($1::uuid[])`,
        [userIds],
      )
      if (balances.rows.some((balance) => Number(balance.available_points) < extra)) {
        throw new CoreError(`추가 정산을 위해 각 참여자에게 ${extra.toLocaleString()}P가 필요합니다.`)
      }
    }
    for (const deposit of deposits.rows) {
      const depositAmount = Number(deposit.amount)
      const finalShare = Number(row.final_share)
      const chargedFromDeposit = Math.min(depositAmount, finalShare)
      await client.query(
        `INSERT INTO point_ledger (
           user_id, entry_type, available_delta, held_delta, trip_id,
           actor_user_id, reason, idempotency_key
         ) VALUES ($1, 'SETTLEMENT_CHARGE', 0, $2, $3, $4, '예치금 정산', $5)`,
        [deposit.user_id, -chargedFromDeposit, tripId, actorId, `trip:${tripId}:charge:${deposit.user_id}`],
      )
      if (depositAmount > finalShare) {
        await client.query(
          `INSERT INTO point_ledger (
             user_id, entry_type, available_delta, held_delta, trip_id,
             actor_user_id, reason, idempotency_key
           ) VALUES ($1, 'REFUND', $2, $3, $4, $5, '정산 차액 반환', $6)`,
          [
            deposit.user_id,
            depositAmount - finalShare,
            -(depositAmount - finalShare),
            tripId,
            actorId,
            `trip:${tripId}:refund:${deposit.user_id}`,
          ],
        )
      } else if (depositAmount < finalShare) {
        await client.query(
          `INSERT INTO point_ledger (
             user_id, entry_type, available_delta, held_delta, trip_id,
             actor_user_id, reason, idempotency_key
           ) VALUES ($1, 'ADDITIONAL_DEBIT', $2, 0, $3, $4, '정산 추가 차감', $5)`,
          [deposit.user_id, -(finalShare - depositAmount), tripId, actorId, `trip:${tripId}:debit:${deposit.user_id}`],
        )
      }
    }
    await client.query(
      `UPDATE trip_participants SET status = 'COMPLETED', completed_at = now()
       WHERE trip_id = $1 AND status = 'DEPOSITED'`,
      [tripId],
    )
    await client.query(
      `UPDATE trip_settlements
       SET status = 'COMPLETED', settlement_idempotency_key = $2, settled_at = now()
       WHERE trip_id = $1`,
      [tripId, idempotencyKey],
    )
    await client.query(
      `UPDATE trip_groups SET status = 'COMPLETED' WHERE trip_id = $1`,
      [tripId],
    )
  })
}
