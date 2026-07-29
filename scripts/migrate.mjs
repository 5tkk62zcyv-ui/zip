import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Pool } from '@neondatabase/serverless'

const allowedEnvironments = new Set(['development', 'preview', 'production'])
const databaseUrl = process.env.DATABASE_MIGRATION_URL
const appEnvironment = process.env.APP_ENVIRONMENT
const expectedDatabaseName = process.env.DATABASE_EXPECTED_NAME
const expectedFingerprint = process.env.DATABASE_FINGERPRINT
const expectedMigrationRole = process.env.DATABASE_EXPECTED_MIGRATION_ROLE

if (!databaseUrl) {
  throw new Error('DATABASE_MIGRATION_URL is required. Do not use the runtime credential for migrations.')
}
if (!appEnvironment || !allowedEnvironments.has(appEnvironment)) {
  throw new Error('APP_ENVIRONMENT must be one of development, preview, or production.')
}
if (!expectedDatabaseName || !expectedFingerprint || !expectedMigrationRole) {
  throw new Error('Expected database name, fingerprint, and migration role are required.')
}

const migrationDirectory = resolve('db/migrations')
const migrationFiles = (await readdir(migrationDirectory))
  .filter((file) => /^\d{4}_[a-z0-9_]+\.sql$/.test(file))
  .sort()

if (!migrationFiles.length) throw new Error('No migrations found.')

const pool = new Pool({ connectionString: databaseUrl, max: 1 })
const client = await pool.connect()

try {
  await client.query('BEGIN')
  await client.query(`SET LOCAL lock_timeout = '10s'`)
  await client.query(`SET LOCAL statement_timeout = '60s'`)
  await client.query('SELECT pg_advisory_xact_lock($1)', [842_027_001])

  const identity = await client.query(
    'SELECT current_database() AS database_name, current_user AS database_user',
  )
  if (
    identity.rows[0]?.database_name !== expectedDatabaseName ||
    identity.rows[0]?.database_user !== expectedMigrationRole
  ) {
    throw new Error('Database guard failed for name or migration role.')
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
    `INSERT INTO application_environment (singleton, environment, fingerprint)
     VALUES (true, $1, $2) ON CONFLICT (singleton) DO NOTHING`,
    [appEnvironment, expectedFingerprint],
  )
  const environmentIdentity = await client.query(
    `SELECT environment, fingerprint FROM application_environment WHERE singleton = true`,
  )
  if (
    environmentIdentity.rows[0]?.environment !== appEnvironment ||
    environmentIdentity.rows[0]?.fingerprint !== expectedFingerprint
  ) {
    throw new Error('Database environment fingerprint mismatch.')
  }

  for (const file of migrationFiles) {
    const version = file.slice(0, -4)
    const migration = await readFile(resolve(migrationDirectory, file), 'utf8')
    const checksum = createHash('sha256').update(migration).digest('hex')
    const existing = await client.query(
      `SELECT checksum, environment FROM schema_migrations WHERE version = $1`,
      [version],
    )
    if (existing.rowCount) {
      if (
        existing.rows[0].checksum !== checksum ||
        existing.rows[0].environment !== appEnvironment
      ) {
        throw new Error(`Migration checksum or environment drift detected for ${version}.`)
      }
      continue
    }
    await client.query(migration)
    await client.query(
      `INSERT INTO schema_migrations (version, checksum, environment) VALUES ($1, $2, $3)`,
      [version, checksum, appEnvironment],
    )
    console.log(`Applied ${version}.`)
  }

  const required = await client.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS users_exists,
      to_regclass('public.trip_groups') IS NOT NULL AS trips_exist,
      to_regclass('public.point_accounts') IS NOT NULL AS accounts_exist,
      to_regclass('public.point_ledger') IS NOT NULL AS ledger_exists
  `)
  if (Object.values(required.rows[0] ?? {}).some((value) => value !== true)) {
    throw new Error('Post-migration verification failed.')
  }
  await client.query('COMMIT')
  console.log(`All migrations are current on ${expectedDatabaseName}.`)
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
