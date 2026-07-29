import 'server-only'

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { assertEnvironmentConfiguration } from './environment'

let database: NeonQueryFunction<false, false> | null = null
let identityCheck: Promise<void> | null = null

export function getDatabaseUrl() {
  const value = process.env.DATABASE_URL

  if (!value) {
    throw new Error('DATABASE_URL is required for database operations.')
  }

  assertEnvironmentConfiguration({
    APP_ENVIRONMENT: process.env.APP_ENVIRONMENT,
    VERCEL_ENV: process.env.VERCEL_ENV,
  })
  return value
}

export function getDatabase() {
  if (!database) {
    database = neon(getDatabaseUrl())
  }

  return database
}

export function ensureDatabaseIdentity() {
  if (!identityCheck) {
    identityCheck = verifyDatabaseIdentity().catch((error) => {
      identityCheck = null
      throw error
    })
  }
  return identityCheck
}

async function verifyDatabaseIdentity() {
  const expectedFingerprint = process.env.DATABASE_FINGERPRINT
  const expectedRole = process.env.DATABASE_EXPECTED_RUNTIME_ROLE
  const expectedEnvironment = process.env.APP_ENVIRONMENT

  if (!expectedFingerprint || !expectedRole || !expectedEnvironment) {
    throw new Error(
      'DATABASE_FINGERPRINT, DATABASE_EXPECTED_RUNTIME_ROLE, and APP_ENVIRONMENT are required.',
    )
  }

  const sql = getDatabase()
  const rows = await sql`
    SELECT
      environment,
      fingerprint,
      current_user AS "databaseRole"
    FROM application_environment
    WHERE singleton = true
  `
  const identity = rows[0] as
    | { environment: string; fingerprint: string; databaseRole: string }
    | undefined

  if (
    !identity ||
    identity.environment !== expectedEnvironment ||
    identity.fingerprint !== expectedFingerprint ||
    identity.databaseRole !== expectedRole
  ) {
    throw new Error('Database identity verification failed.')
  }
}

export function hasDatabaseConfiguration() {
  return Boolean(process.env.DATABASE_URL)
}
