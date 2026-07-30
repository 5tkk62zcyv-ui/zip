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
  .update(await readFile('db/migrations/0007_participation_state_guards.sql'))
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
         WHERE version = '0006_require_fare_evidence_for_confirmation'
           AND environment = $3
       ) AS prerequisite_valid,
       (
         SELECT count(*) = 0 FROM schema_migrations
         WHERE version = '0007_participation_state_guards'
       ) AS migration_not_recorded,
       (
         SELECT count(*) = 0
         FROM (
           SELECT g.trip_id
           FROM trip_groups g
           LEFT JOIN trip_participants p
             ON p.trip_id = g.trip_id
            AND p.status IN (
              'APPROVED', 'DEPOSITED', 'CHECKED_IN',
              'NO_SHOW', 'DISPUTED', 'COMPLETED'
            )
           GROUP BY g.trip_id, g.max_participants
           HAVING count(p.user_id) > g.max_participants
         ) invalid
       ) AS capacities_valid,
       (
         SELECT count(*) = 0
         FROM trip_participants p
         JOIN users u ON u.user_id = p.user_id
         WHERE p.status IN ('APPLIED', 'APPROVED')
           AND (
             u.account_status <> 'ACTIVE'
             OR nullif(btrim(u.student_id), '') IS NULL
             OR nullif(btrim(u.name), '') IS NULL
             OR nullif(btrim(u.school_email), '') IS NULL
           )
       ) AS participant_users_valid`,
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
    throw new Error(`Sprint 4 migration preflight failed: ${failures.join(', ')}.`)
  }
  console.log(`Sprint 4 migration preflight passed; 0007 sha256 ${checksum}.`)
  await client.query('ROLLBACK')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
