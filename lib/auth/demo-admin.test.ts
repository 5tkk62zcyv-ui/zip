import { describe, expect, it } from 'vitest'
import { isDemoAdminLoginAllowed } from './demo-admin'

describe('isDemoAdminLoginAllowed', () => {
  it('allows only the explicit local closed-demo identity', () => {
    expect(
      isDemoAdminLoginAllowed({
        studentId: '123456789',
        name: '택시타쉐어관리자',
        enabled: 'true',
      }),
    ).toBe(true)
  })

  it('blocks the demo admin login when the explicit flag is disabled', () => {
    expect(
      isDemoAdminLoginAllowed({
        studentId: '123456789',
        name: '택시타쉐어관리자',
        enabled: undefined,
      }),
    ).toBe(false)
  })

  it('blocks every other identity even when the flag is enabled', () => {
    expect(
      isDemoAdminLoginAllowed({
        studentId: '123456788',
        name: '택시타쉐어관리자',
        enabled: 'true',
      }),
    ).toBe(false)
  })
})
