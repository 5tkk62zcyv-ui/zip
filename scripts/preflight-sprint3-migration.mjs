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
  .update(
    await readFile(
      'db/migrations/0006_require_fare_evidence_for_confirmation.sql',
    ),
  )
  .digest('hex')

const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query('BEGIN READ ONLY')
  await client.query(`SET LOCAL lock_timeout = '5s'`)
  await client.query(`SET LOCAL statement_timeout = '30s'`)

  const identity = await client.query(
    `SELECT
       current_database() = $1 AS database_matches,
       current_user = $2 AS role_matches,
       EXISTS (
         SELECT 1
         FROM application_environment
         WHERE singleton = true
           AND environment = $3
           AND fingerprint = $4
       ) AS environment_matches`,
    [
      expectedDatabaseName,
      expectedRole,
      expectedEnvironment,
      expectedFingerprint,
    ],
  )

  const checks = await client.query(
    `SELECT
       (
         SELECT count(*) = 1
         FROM schema_migrations
         WHERE version = '0005_provider_neutral_fare_evidence'
           AND environment = $1
       ) AS prerequisite_valid,
       (
         SELECT count(*) = 0
         FROM schema_migrations
         WHERE version = '0006_require_fare_evidence_for_confirmation'
       ) AS migration_not_recorded,
       (
         SELECT count(*) = 0
         FROM trip_groups
         WHERE estimated_fare IS NOT NULL
           AND estimated_fare NOT BETWEEN 1 AND 1000000
       ) AS legacy_fares_valid,
       (
         SELECT count(*) = 0
         FROM trip_groups g
         LEFT JOIN fare_estimates f
           ON f.trip_id = g.trip_id
          AND f.fare_estimate_id = g.current_fare_estimate_id
         WHERE g.status = 'CONFIRMED'
           AND (
             f.fare_estimate_id IS NULL
             OR f.trip_location_revision <> g.location_revision
             OR f.deposit_points_total IS DISTINCT FROM g.estimated_fare
             OR f.expires_at <= now()
           )
       ) AS confirmed_fare_evidence_valid`,
    [expectedEnvironment],
  )

  const combined = {
    ...(identity.rows[0] ?? {}),
    ...(checks.rows[0] ?? {}),
  }
  const failures = Object.entries(combined)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name)
  if (failures.length) {
    throw new Error(`Sprint 3 migration preflight failed: ${failures.join(', ')}.`)
  }

  console.log(
    `Sprint 3 confirmation guard preflight passed; 0006 sha256 ${checksum}.`,
  )
  await client.query('ROLLBACK')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
