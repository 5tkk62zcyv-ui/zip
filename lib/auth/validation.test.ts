import { describe, expect, it } from 'vitest'
import { signupSchema } from './validation'

const valid = {
  signupAttemptId: '123e4567-e89b-42d3-a456-426614174000',
  studentId: '20213456',
  name: '김민지',
  gender: 'female',
  schoolEmail: 'MINJI@JBNU.AC.KR',
  privacyConsent: 'on',
}

describe('signupSchema', () => {
  it('normalizes a valid signup', () => {
    const result = signupSchema.parse(valid)
    expect(result.schoolEmail).toBe('minji@jbnu.ac.kr')
  })

  it.each([
    ['blank student id', { studentId: ' ' }],
    ['invalid signup attempt', { signupAttemptId: 'not-a-uuid' }],
    ['blank name', { name: ' ' }],
    ['invalid email', { schoolEmail: 'not-an-email' }],
    ['missing gender', { gender: undefined }],
    ['unselected gender', { gender: 'none' }],
    ['missing consent', { privacyConsent: undefined }],
  ])('rejects %s', (_name, patch) => {
    expect(signupSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })
})
