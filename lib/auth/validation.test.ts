import { describe, expect, it } from 'vitest'
import { loginSchema, signupSchema } from './validation'

const valid = {
  signupAttemptId: '123e4567-e89b-42d3-a456-426614174000',
  studentId: '202134567',
  name: '김민지',
  gender: 'female',
  schoolEmail: '  MINJI@JBNU.AC.KR  ',
  privacyConsent: 'on',
}

describe('signupSchema', () => {
  it('normalizes a valid signup', () => {
    const result = signupSchema.parse({ ...valid, studentId: ' 202134567 ' })
    expect(result.studentId).toBe('202134567')
    expect(result.schoolEmail).toBe('minji@jbnu.ac.kr')
  })

  it.each([
    ['blank student id', { studentId: ' ' }],
    ['eight digit student id', { studentId: '20213456' }],
    ['ten digit student id', { studentId: '2021345678' }],
    ['student id containing a letter', { studentId: '20213456A' }],
    ['student id containing a hyphen', { studentId: '2021-3456' }],
    ['invalid signup attempt', { signupAttemptId: 'not-a-uuid' }],
    ['blank name', { name: ' ' }],
    ['invalid email', { schoolEmail: 'not-an-email' }],
    ['email from another domain', { schoolEmail: 'minji@example.com' }],
    ['email from a subdomain', { schoolEmail: 'minji@dept.jbnu.ac.kr' }],
    ['email with an empty local part', { schoolEmail: '@jbnu.ac.kr' }],
    ['email with text after the school domain', { schoolEmail: 'minji@jbnu.ac.kr.example.com' }],
    ['missing gender', { gender: undefined }],
    ['unselected gender', { gender: 'none' }],
    ['missing consent', { privacyConsent: undefined }],
  ])('rejects %s', (_name, patch) => {
    expect(signupSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('normalizes a valid MVP login', () => {
    expect(loginSchema.parse({ studentId: ' 202134567 ', name: ' 김민지 ' }))
      .toEqual({ studentId: '202134567', name: '김민지' })
  })

  it.each([
    { studentId: '20213456', name: '김민지' },
    { studentId: '20213456A', name: '김민지' },
    { studentId: '202134567', name: '   ' },
  ])('rejects invalid MVP login: %o', (input) => {
    expect(loginSchema.safeParse(input).success).toBe(false)
  })
})
