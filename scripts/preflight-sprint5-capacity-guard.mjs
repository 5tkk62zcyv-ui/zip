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
      'db/migrations/0009_recommendation_capacity_snapshot_guard.sql',
    ),
  )
  .digest('hex')

const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query('BEGIN READ ONLY')
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
         WHERE version = '0008_recommendation_evidence_v2'
           AND environment = $3
       ) AS prerequisite_valid,
       (
         SELECT count(*) = 0 FROM schema_migrations
         WHERE version = '0009_recommendation_capacity_snapshot_guard'
       ) AS migration_not_recorded`,
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
    throw new Error(`Sprint 5 capacity preflight failed: ${failures.join(', ')}.`)
  }
  console.log(`Sprint 5 capacity preflight passed; 0009 sha256 ${checksum}.`)
  await client.query('ROLLBACK')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
