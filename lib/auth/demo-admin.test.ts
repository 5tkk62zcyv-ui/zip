import { describe, expect, it } from 'vitest'
import { isDemoAdminLoginAllowed } from './demo-admin'

describe('isDemoAdminLoginAllowed', () => {
  it('allows only the explicit local closed-demo identity', () => {
    expect(
      isDemoAdminLoginAllowed({
        studentId: '123456789',
        name: '택시타쉐어관리자',
        nodeEnv: 'development',
        enabled: 'true',
      }),
    ).toBe(true)
  })

  it('always blocks the demo admin login in production', () => {
    expect(
      isDemoAdminLoginAllowed({
        studentId: '123456789',
        name: '택시타쉐어관리자',
        nodeEnv: 'production',
        enabled: 'true',
      }),
    ).toBe(false)
  })
})
