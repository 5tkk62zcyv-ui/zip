import { randomUUID } from 'node:crypto'
import { Pool } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_URL
const expectedName = process.env.DATABASE_EXPECTED_NAME
const expectedFingerprint = process.env.DATABASE_FINGERPRINT
const expectedRole = process.env.DATABASE_EXPECTED_RUNTIME_ROLE
const appEnvironment = process.env.APP_ENVIRONMENT

if (
  !['development', 'preview', 'production'].includes(appEnvironment) ||
  process.env.DEMO_ADMIN_LOGIN_ENABLED !== 'true'
) {
  throw new Error(
    'Demo admin provisioning requires a known environment and the explicit login flag.',
  )
}
if (!connectionString || !expectedName || !expectedFingerprint || !expectedRole) {
  throw new Error('Runtime database identity guard variables are required.')
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
    environment.rows[0]?.environment !== appEnvironment ||
    environment.rows[0]?.fingerprint !== expectedFingerprint
  ) {
    throw new Error('Database identity guard failed.')
  }
  const user = await client.query(
    `SELECT user_id, role, account_status
     FROM users
     WHERE student_id = '123456789'
       AND name = '택시타쉐어관리자'
     FOR UPDATE`,
  )
  if (user.rowCount === 0) {
    await client.query(
      `INSERT INTO users (
         signup_attempt_id, student_id, name, gender, school_email,
         role, account_status
       )
       VALUES ($1, '123456789', '택시타쉐어관리자', 'male',
               'taxitashare.admin@jbnu.ac.kr', 'ADMIN', 'ACTIVE')`,
      [randomUUID()],
    )
  } else if (user.rows[0].account_status !== 'ACTIVE') {
    throw new Error('The demo administrator identity is not active.')
  } else if (user.rows[0].role !== 'ADMIN') {
    await client.query(
      `UPDATE users SET role = 'ADMIN' WHERE user_id = $1`,
      [user.rows[0].user_id],
    )
  }
  await client.query(
    `UPDATE auth_sessions
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE user_id = (
       SELECT user_id FROM users
       WHERE student_id = '123456789'
         AND name = '택시타쉐어관리자'
     )`,
  )
  await client.query('COMMIT')
  console.log(`Provisioned the ${appEnvironment} demo administrator.`)
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
