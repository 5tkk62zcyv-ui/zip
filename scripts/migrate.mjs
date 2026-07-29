import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Pool } from '@neondatabase/serverless'

const allowedEnvironments = new Set(['development', 'preview', 'production'])
const databaseUrl = process.env.DATABASE_MIGRATION_URL
const appEnvironment = process.env.APP_ENVIRONMENT
const expectedDatabaseName = process.env.DATABASE_EXPECTED_NAME
const expectedFingerprint = process.env.DATABASE_FINGERPRINT
const expectedMigrationRole = process.env.DATABASE_EXPECTED_MIGRATION_ROLE

if (!databaseUrl) {
  throw new Error(
    'DATABASE_MIGRATION_URL is required. Do not use the runtime credential for migrations.',
  )
}

if (!appEnvironment || !allowedEnvironments.has(appEnvironment)) {
  throw new Error(
    'APP_ENVIRONMENT must be one of development, preview, or production.',
  )
}

if (!expectedDatabaseName) {
  throw new Error('DATABASE_EXPECTED_NAME is required as a migration safety guard.')
}

if (!expectedFingerprint || !expectedMigrationRole) {
  throw new Error(
    'DATABASE_FINGERPRINT and DATABASE_EXPECTED_MIGRATION_ROLE are required.',
  )
}

const version = '0001_users_and_sessions'
const migrationPath = resolve(`db/migrations/${version}.sql`)
const migration = await readFile(migrationPath, 'utf8')
const checksum = createHash('sha256').update(migration).digest('hex')
const advisoryLockId = 842_027_001
const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query('BEGIN')
  await client.query(`SET LOCAL lock_timeout = '10s'`)
  await client.query(`SET LOCAL statement_timeout = '60s'`)
  await client.query('SELECT pg_advisory_xact_lock($1)', [advisoryLockId])

  const identity = await client.query(
    'SELECT current_database() AS database_name, current_user AS database_user',
  )
  const actualDatabaseName = identity.rows[0]?.database_name
  const actualDatabaseRole = identity.rows[0]?.database_user

  if (
    actualDatabaseName !== expectedDatabaseName ||
    actualDatabaseRole !== expectedMigrationRole
  ) {
    throw new Error(
      `Database guard failed for name or migration role.`,
    )
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      environment text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT schema_migrations_environment_valid
        CHECK (environment IN ('development', 'preview', 'production'))
    )
  `)

  await client.query(`
    CREATE TABLE IF NOT EXISTS application_environment (
      singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
      environment text NOT NULL,
      fingerprint text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT application_environment_valid
        CHECK (environment IN ('development', 'preview', 'production'))
    )
  `)

  await client.query(
    `
      INSERT INTO application_environment (singleton, environment, fingerprint)
      VALUES (true, $1, $2)
      ON CONFLICT (singleton) DO NOTHING
    `,
    [appEnvironment, expectedFingerprint],
  )

  const environmentIdentity = await client.query(`
    SELECT environment, fingerprint
    FROM application_environment
    WHERE singleton = true
  `)
  const storedIdentity = environmentIdentity.rows[0]

  if (
    storedIdentity?.environment !== appEnvironment ||
    storedIdentity?.fingerprint !== expectedFingerprint
  ) {
    throw new Error('Database environment fingerprint mismatch.')
  }

  const existing = await client.query(
    `
      SELECT checksum, environment
      FROM schema_migrations
      WHERE version = $1
    `,
    [version],
  )

  if (existing.rowCount) {
    const applied = existing.rows[0]
    if (applied.checksum !== checksum) {
      throw new Error(`Migration checksum drift detected for ${version}.`)
    }
    if (applied.environment !== appEnvironment) {
      throw new Error(
        `Migration environment mismatch for ${version}: ${applied.environment}.`,
      )
    }
    await client.query('COMMIT')
    console.log(`Migration ${version} is already applied with matching checksum.`)
  } else {
    await client.query(migration)
    await client.query(
      `
        INSERT INTO schema_migrations (version, checksum, environment)
        VALUES ($1, $2, $3)
      `,
      [version, checksum, appEnvironment],
    )

    const verification = await client.query(`
      SELECT
        to_regclass('public.users') IS NOT NULL AS users_exists,
        to_regclass('public.auth_sessions') IS NOT NULL AS sessions_exists,
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
        ) AS sessions_valid
    `)
    const result = verification.rows[0]

    if (
      !result?.users_exists ||
      !result?.sessions_exists ||
      !result?.users_valid ||
      !result?.sessions_valid
    ) {
      throw new Error(`Post-migration verification failed for ${version}.`)
    }

    await client.query('COMMIT')
    console.log(
      `Applied ${version} to ${actualDatabaseName} as ${identity.rows[0]?.database_user}.`,
    )
  }
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
