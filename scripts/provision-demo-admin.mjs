import { Pool } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_MIGRATION_URL
const expectedName = process.env.DATABASE_EXPECTED_NAME
const expectedFingerprint = process.env.DATABASE_FINGERPRINT
const expectedRole = process.env.DATABASE_EXPECTED_MIGRATION_ROLE

if (process.env.APP_ENVIRONMENT !== 'development') {
  throw new Error('Demo admin provisioning is allowed only in development.')
}
if (!connectionString || !expectedName || !expectedFingerprint || !expectedRole) {
  throw new Error('Development migration DB guard variables are required.')
}

const pool = new Pool({ connectionString, max: 1 })
const client = await pool.connect()
try {
  await client.query('BEGIN')
  const identity = await client.query(
    `SELECT current_database() AS database_name, current_user AS database_user`,
  )
  const environment = await client.query(
    `SELECT environment, fingerprint
     FROM application_environment
     WHERE singleton = true`,
  )
  if (
    identity.rows[0]?.database_name !== expectedName ||
    identity.rows[0]?.database_user !== expectedRole ||
    environment.rows[0]?.environment !== 'development' ||
    environment.rows[0]?.fingerprint !== expectedFingerprint
  ) {
    throw new Error('Development database identity guard failed.')
  }
  const user = await client.query(
    `SELECT user_id, role, account_status
     FROM users
     WHERE student_id = '123456789'
       AND name = '택시타쉐어관리자'
     FOR UPDATE`,
  )
  if (user.rowCount !== 1 || user.rows[0].account_status !== 'ACTIVE') {
    throw new Error(
      'Create one active complete demo user with the requested identity first.',
    )
  }
  await client.query(
    `UPDATE users SET role = 'ADMIN' WHERE user_id = $1`,
    [user.rows[0].user_id],
  )
  await client.query(
    `UPDATE auth_sessions
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE user_id = $1`,
    [user.rows[0].user_id],
  )
  await client.query('COMMIT')
  console.log('Provisioned the closed-development demo administrator.')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
