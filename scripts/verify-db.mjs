import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Pool } from '@neondatabase/serverless'

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
const expectedDatabaseName = process.env.DATABASE_EXPECTED_NAME
const expectedFingerprint = process.env.DATABASE_FINGERPRINT
const expectedEnvironment = process.env.APP_ENVIRONMENT
const expectedRole =
  process.env.DATABASE_EXPECTED_MIGRATION_ROLE ??
  process.env.DATABASE_EXPECTED_RUNTIME_ROLE
const domainMigrationChecksum = createHash('sha256')
  .update(await readFile('db/migrations/0003_mvp_domain_completion.sql'))
  .digest('hex')

if (
  !databaseUrl ||
  !expectedDatabaseName ||
  !expectedFingerprint ||
  !expectedEnvironment ||
  !expectedRole
) {
  throw new Error(
    'Database URL, name, fingerprint, environment, and expected role are required.',
  )
}

const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  const identity = await client.query(
    'SELECT current_database() AS database_name, current_user AS database_user',
  )
  const actualDatabaseName = identity.rows[0]?.database_name

  if (
    actualDatabaseName !== expectedDatabaseName ||
    identity.rows[0]?.database_user !== expectedRole
  ) {
    throw new Error(
      `Database guard failed: expected ${expectedDatabaseName}, received ${actualDatabaseName}.`,
    )
  }

  const result = await client.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS users_exists,
      to_regclass('public.auth_sessions') IS NOT NULL AS sessions_exists,
      to_regclass('public.schema_migrations') IS NOT NULL AS migrations_exists,
      to_regclass('public.trip_groups') IS NOT NULL AS trips_exists,
      to_regclass('public.trip_participants') IS NOT NULL AS participants_exists,
      to_regclass('public.trip_settlements') IS NOT NULL AS settlements_exists,
      to_regclass('public.point_accounts') IS NOT NULL AS point_accounts_exists,
      to_regclass('public.point_ledger') IS NOT NULL AS point_ledger_exists,
      to_regclass('public.fare_disputes') IS NOT NULL AS fare_disputes_exists,
      to_regclass('public.trip_recommendation_evidence') IS NOT NULL
        AS recommendation_evidence_exists,
      (
        SELECT count(*) = 1
        FROM schema_migrations
        WHERE version = '0003_mvp_domain_completion'
          AND checksum = $3
          AND environment = $1
      ) AS domain_migration_valid,
      (
        SELECT count(*) = 1
        FROM application_environment
        WHERE singleton = true
          AND environment = $1
          AND fingerprint = $2
      ) AS environment_valid,
      (
        SELECT count(*) = 0
        FROM users
        WHERE nullif(btrim(student_id), '') IS NULL
           OR student_id <> btrim(student_id)
           OR nullif(btrim(name), '') IS NULL
           OR nullif(btrim(school_email), '') IS NULL
      ) AS users_valid,
      (
        SELECT count(*) = 0
        FROM auth_sessions s
        LEFT JOIN users u ON u.user_id = s.user_id
        WHERE u.user_id IS NULL
           OR s.expires_at <= s.created_at
           OR s.revoked_at < s.created_at
      ) AS sessions_valid,
      EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'auth_sessions'
          AND indexname = 'auth_sessions_expires_at_idx'
      ) AS expiry_index_exists,
      (
        SELECT count(*) = 0
        FROM point_accounts
        WHERE available_points < 0 OR held_points < 0
      ) AS balances_nonnegative,
      (
        SELECT count(*) = 0
        FROM point_accounts a
        LEFT JOIN (
          SELECT
            user_id,
            sum(available_delta) AS available_points,
            sum(held_delta) AS held_points
          FROM point_ledger
          GROUP BY user_id
        ) l ON l.user_id = a.user_id
        WHERE a.available_points <> COALESCE(l.available_points, 0)
           OR a.held_points <> COALESCE(l.held_points, 0)
      ) AS ledger_balances_match,
      (
        SELECT count(*) = 0
        FROM trip_settlements
        WHERE confirmation_deadline IS NULL
           OR confirmation_deadline <= submitted_at
      ) AS settlement_deadlines_valid,
      EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'point_ledger'::regclass
          AND tgname = 'point_ledger_prevent_mutation'
          AND NOT tgisinternal
      ) AS ledger_append_only
  `, [expectedEnvironment, expectedFingerprint, domainMigrationChecksum])

  const verification = result.rows[0]
  const failedChecks = Object.entries(verification ?? {})
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name)

  if (failedChecks.length) {
    throw new Error(`Database verification failed: ${failedChecks.join(', ')}.`)
  }

  console.log(
    `Verified ${actualDatabaseName} as ${identity.rows[0]?.database_user}.`,
  )
} finally {
  client.release()
  await pool.end()
}
