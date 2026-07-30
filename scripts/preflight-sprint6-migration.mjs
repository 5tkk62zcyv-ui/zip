import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Pool } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_MIGRATION_URL
const expectedDatabaseName = process.env.DATABASE_EXPECTED_NAME
const expectedRole = process.env.DATABASE_EXPECTED_MIGRATION_ROLE
const expectedEnvironment = process.env.APP_ENVIRONMENT
const expectedFingerprint = process.env.DATABASE_FINGERPRINT

if (
  !databaseUrl ||
  !expectedDatabaseName ||
  !expectedRole ||
  !expectedEnvironment ||
  !expectedFingerprint
) {
  throw new Error('Migration identity variables are required.')
}

const checksum = createHash('sha256')
  .update(await readFile('db/migrations/0010_sprint6_point_escrow.sql'))
  .digest('hex')

const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query('BEGIN READ ONLY')
  await client.query(`SET LOCAL lock_timeout = '5s'`)
  await client.query(`SET LOCAL statement_timeout = '30s'`)
  const result = await client.query(
    `SELECT
       current_database() = $1 AS database_matches,
       current_user = $2 AS role_matches,
       EXISTS (
         SELECT 1 FROM application_environment
         WHERE singleton = true AND environment = $3 AND fingerprint = $4
       ) AS environment_matches,
       (
         SELECT count(*) = 1 FROM schema_migrations
         WHERE version = '0009_recommendation_capacity_snapshot_guard'
           AND environment = $3
       ) AS prerequisite_valid,
       (
         SELECT count(*) = 0 FROM schema_migrations
         WHERE version = '0010_sprint6_point_escrow'
       ) AS migration_not_recorded,
       (
         SELECT count(*) = 0 FROM point_accounts a
         LEFT JOIN (
           SELECT user_id,
                  sum(available_delta) AS available_points,
                  sum(held_delta) AS held_points
           FROM point_ledger GROUP BY user_id
         ) l ON l.user_id = a.user_id
         WHERE a.available_points <> COALESCE(l.available_points, 0)
            OR a.held_points <> COALESCE(l.held_points, 0)
       ) AS ledger_balances_match,
       (
         SELECT count(*) = 0
         FROM (
           SELECT trip_id, user_id
           FROM point_ledger
           WHERE entry_type = 'DEPOSIT'
           GROUP BY trip_id, user_id
           HAVING count(*) > 1
         ) duplicate_deposits
       ) AS deposit_ledger_unique`,
    [
      expectedDatabaseName,
      expectedRole,
      expectedEnvironment,
      expectedFingerprint,
    ],
  )

  const failures = Object.entries(result.rows[0] ?? {})
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name)
  if (failures.length) {
    throw new Error(`Sprint 6 migration preflight failed: ${failures.join(', ')}.`)
  }
  console.log(`Sprint 6 migration preflight passed; 0010 sha256 ${checksum}.`)
  await client.query('ROLLBACK')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
