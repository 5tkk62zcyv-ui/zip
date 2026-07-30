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
  throw new Error('Production migration identity variables are required.')
}

const migrationChecksum = createHash('sha256')
  .update(await readFile('db/migrations/0004_sprint2_trip_lifecycle.sql'))
  .digest('hex')

const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query('BEGIN READ ONLY')
  await client.query(`SET LOCAL lock_timeout = '5s'`)
  await client.query(`SET LOCAL statement_timeout = '30s'`)

  const identity = await client.query(
    `SELECT
       current_database() AS database_name,
       current_user AS database_user,
       (
         SELECT environment
         FROM application_environment
         WHERE singleton = true AND fingerprint = $1
       ) AS application_environment`,
    [expectedFingerprint],
  )
  const actual = identity.rows[0]
  if (
    actual?.database_name !== expectedDatabaseName ||
    actual?.database_user !== expectedRole ||
    actual?.application_environment !== expectedEnvironment ||
    expectedEnvironment !== 'production'
  ) {
    throw new Error(
      `Production database identity preflight failed: ${JSON.stringify({
        databaseNameMatches: actual?.database_name === expectedDatabaseName,
        databaseRoleMatches: actual?.database_user === expectedRole,
        fingerprintMatches:
          actual?.application_environment === expectedEnvironment,
        environmentIsProduction: expectedEnvironment === 'production',
      })}`,
    )
  }

  const result = await client.query(
    `SELECT
       (
         SELECT count(*) = 1
         FROM schema_migrations
         WHERE version = '0003_mvp_domain_completion'
           AND environment = 'production'
       ) AS prerequisite_migration_valid,
       (
         SELECT count(*) = 0
         FROM trip_groups
         WHERE
           (status = 'OPEN' AND (
             closed_at IS NOT NULL
             OR closure_type IS NOT NULL
             OR cancelled_at IS NOT NULL
           ))
           OR
           (status = 'CANCELLED' AND (
             closed_at IS NULL
             OR closure_type IS DISTINCT FROM 'CANCELLED'
             OR cancelled_at IS NULL
           ))
           OR
           (status IN (
             'CLOSED', 'CONFIRMED', 'IN_PROGRESS',
             'SETTLEMENT_PENDING', 'COMPLETED', 'EXPIRED'
           ) AND (
             closed_at IS NULL
             OR closure_type NOT IN ('AUTO', 'HOST')
             OR cancelled_at IS NOT NULL
           ))
       ) AS lifecycle_data_valid,
       (
         SELECT count(*) = 0
         FROM trip_groups g
         LEFT JOIN trip_participants p
           ON p.trip_id = g.trip_id
          AND p.role = 'HOST'
          AND p.user_id = g.host_user_id
         WHERE p.user_id IS NULL
       ) AS hosts_valid,
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
         FROM trip_groups
         WHERE estimated_fare NOT BETWEEN 1 AND 1000000
       ) AS estimated_fares_valid,
       (
         SELECT count(*) = 0
         FROM trip_groups
         WHERE (status = 'CLOSED' AND (
           SELECT count(*)
           FROM trip_participants p
           WHERE p.trip_id = trip_groups.trip_id
             AND p.status IN (
               'APPROVED', 'DEPOSITED', 'CHECKED_IN',
               'NO_SHOW', 'DISPUTED', 'COMPLETED'
             )
         ) < 2)
         OR (status = 'EXPIRED' AND (
           SELECT count(*)
           FROM trip_participants p
           WHERE p.trip_id = trip_groups.trip_id
             AND p.status IN (
               'APPROVED', 'DEPOSITED', 'CHECKED_IN',
               'NO_SHOW', 'DISPUTED', 'COMPLETED'
             )
         ) >= 2)
       ) AS closure_counts_valid,
       (
         SELECT count(*) = 0
         FROM schema_migrations
         WHERE version = '0004_sprint2_trip_lifecycle'
       ) AS migration_not_already_recorded`,
  )

  const checks = result.rows[0] ?? {}
  const failures = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name)
  if (failures.length) {
    throw new Error(`Sprint 2 migration preflight failed: ${failures.join(', ')}.`)
  }

  console.log(
    `Preflight passed for ${actual.database_name} as ${actual.database_user}; 0004 sha256 ${migrationChecksum}.`,
  )
  await client.query('ROLLBACK')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
