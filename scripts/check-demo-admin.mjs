import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.')
}

const sql = neon(process.env.DATABASE_URL)
const identity = await sql`
  SELECT
    current_database() AS "databaseName",
    current_user AS "databaseRole",
    environment,
    fingerprint = ${process.env.DATABASE_FINGERPRINT ?? ''} AS "fingerprintMatches"
  FROM application_environment
  WHERE singleton = true
`
const rows = await sql`
  SELECT role, account_status
  FROM users
  WHERE student_id = '123456789'
    AND name = '택시타쉐어관리자'
`

console.log(
  JSON.stringify({
    exists: rows.length === 1,
    role: rows[0]?.role ?? null,
    active: rows[0]?.account_status === 'ACTIVE',
    databaseName: identity[0]?.databaseName ?? null,
    databaseRole: identity[0]?.databaseRole ?? null,
    environment: identity[0]?.environment ?? null,
    fingerprintMatches: identity[0]?.fingerprintMatches ?? false,
  }),
)
