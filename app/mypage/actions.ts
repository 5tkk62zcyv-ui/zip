'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  clearSessionCookie,
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session'
import { ensureDatabaseIdentity, getDatabase } from '@/lib/db/client'

export async function logoutAction() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (token) {
    await ensureDatabaseIdentity()
    const sql = getDatabase()
    await sql`
      UPDATE auth_sessions
         SET revoked_at = COALESCE(revoked_at, now())
       WHERE token_hash = ${hashSessionToken(token)}
    `
  }
  await clearSessionCookie()
  redirect('/')
}
