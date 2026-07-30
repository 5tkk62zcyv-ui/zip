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
const lifecycleMigrationChecksum = createHash('sha256')
  .update(await readFile('db/migrations/0004_sprint2_trip_lifecycle.sql'))
  .digest('hex')
const fareEvidenceMigrationChecksum = createHash('sha256')
  .update(
    await readFile('db/migrations/0005_provider_neutral_fare_evidence.sql'),
  )
  .digest('hex')
const confirmationGuardMigrationChecksum = createHash('sha256')
  .update(
    await readFile(
      'db/migrations/0006_require_fare_evidence_for_confirmation.sql',
    ),
  )
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
        FROM schema_migrations
        WHERE version = '0004_sprint2_trip_lifecycle'
          AND checksum = $4
          AND environment = $1
      ) AS lifecycle_migration_valid,
      (
        SELECT count(*) = 1
        FROM schema_migrations
        WHERE version = '0005_provider_neutral_fare_evidence'
          AND checksum = $5
          AND environment = $1
      ) AS fare_evidence_migration_valid,
      (
        SELECT count(*) = 1
        FROM schema_migrations
        WHERE version = '0006_require_fare_evidence_for_confirmation'
          AND checksum = $6
          AND environment = $1
      ) AS confirmation_guard_migration_valid,
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
      ) AS ledger_append_only,
      (
        SELECT count(*) = 0
        FROM trip_groups
        WHERE NOT (
          (
            status = 'OPEN'
            AND closed_at IS NULL
            AND closure_type IS NULL
            AND cancelled_at IS NULL
          )
          OR (
            status = 'CANCELLED'
            AND closed_at IS NOT NULL
            AND closure_type = 'CANCELLED'
            AND cancelled_at IS NOT NULL
          )
          OR (
            status IN (
              'CLOSED', 'CONFIRMED', 'IN_PROGRESS',
              'SETTLEMENT_PENDING', 'COMPLETED', 'EXPIRED'
            )
            AND closed_at IS NOT NULL
            AND closure_type IN ('AUTO', 'HOST')
            AND cancelled_at IS NULL
          )
        )
      ) AS trip_lifecycle_valid,
      EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'trip_participants'::regclass
          AND tgname = 'trip_participants_enforce_capacity'
          AND NOT tgisinternal
      ) AS participant_capacity_trigger_exists,
      EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'trip_groups'::regclass
          AND tgname = 'trip_groups_enforce_closure_count'
          AND NOT tgisinternal
      ) AS closure_count_trigger_exists,
      (
        SELECT count(*) = 0
        FROM trip_groups g
        LEFT JOIN trip_participants p
          ON p.trip_id = g.trip_id
         AND p.role = 'HOST'
         AND p.user_id = g.host_user_id
        WHERE p.user_id IS NULL
      ) AS trip_hosts_valid,
      to_regclass('public.fare_estimates') IS NOT NULL
        AS fare_estimates_exists,
      (
        SELECT count(*) = 0
        FROM fare_estimates
        WHERE route_distance_m < 0
           OR duration_seconds < 0
           OR estimated_fare_won NOT BETWEEN 1 AND 1000000
           OR deposit_points_total NOT BETWEEN 1 AND 1000000
           OR expires_at <= calculated_at
           OR jsonb_typeof(calculation_basis) <> 'object'
           OR calculation_basis = '{}'::jsonb
      ) AS fare_estimates_valid,
      (
        SELECT count(*) = 0
        FROM trip_groups g
        JOIN fare_estimates f
          ON f.fare_estimate_id = g.current_fare_estimate_id
        WHERE f.trip_id <> g.trip_id
           OR f.trip_location_revision <> g.location_revision
           OR f.deposit_points_total IS DISTINCT FROM g.estimated_fare
      ) AS active_fare_estimates_valid,
      EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'trip_groups'::regclass
          AND tgname = 'trip_groups_require_fare_evidence'
          AND NOT tgisinternal
      ) AS confirmation_guard_exists,
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
      ) AS confirmed_fare_evidence_valid
  `, [
    expectedEnvironment,
    expectedFingerprint,
    domainMigrationChecksum,
    lifecycleMigrationChecksum,
    fareEvidenceMigrationChecksum,
    confirmationGuardMigrationChecksum,
  ])

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
