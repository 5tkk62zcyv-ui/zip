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
  .update(await readFile('db/migrations/0008_recommendation_evidence_v2.sql'))
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
         WHERE version = '0007_participation_state_guards'
           AND environment = $3
       ) AS prerequisite_valid,
       (
         SELECT count(*) = 0 FROM schema_migrations
         WHERE version = '0008_recommendation_evidence_v2'
       ) AS migration_not_recorded,
       to_regclass('public.trip_recommendation_evidence') IS NOT NULL
         AS evidence_table_exists,
       to_regclass('public.fare_estimates') IS NOT NULL
         AS fare_estimates_table_exists`,
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
    throw new Error(`Sprint 5 migration preflight failed: ${failures.join(', ')}.`)
  }
  console.log(`Sprint 5 migration preflight passed; 0008 sha256 ${checksum}.`)
  await client.query('ROLLBACK')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
