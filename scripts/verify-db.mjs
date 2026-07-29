import { Pool } from '@neondatabase/serverless'

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL
const expectedDatabaseName = process.env.DATABASE_EXPECTED_NAME
const expectedFingerprint = process.env.DATABASE_FINGERPRINT
const expectedEnvironment = process.env.APP_ENVIRONMENT
const expectedRole =
  process.env.DATABASE_EXPECTED_MIGRATION_ROLE ??
  process.env.DATABASE_EXPECTED_RUNTIME_ROLE

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
      ) AS expiry_index_exists
  `, [expectedEnvironment, expectedFingerprint])

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
