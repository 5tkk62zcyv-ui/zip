import { z } from 'zod'

export const genderValues = ['female', 'male'] as const

export const signupSchema = z.object({
  signupAttemptId: z.uuid('가입 요청 식별자가 올바르지 않습니다.'),
  studentId: z
    .string()
    .trim()
    .regex(/^\d{9}$/, '학번은 숫자 9자리로 입력해주세요.'),
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요.')
    .max(80, '이름은 80자 이하여야 합니다.'),
  gender: z.enum(genderValues, {
    error: '성별을 선택해주세요.',
  }),
  schoolEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, '이메일이 너무 깁니다.')
    .email('올바른 학교 이메일을 입력해주세요.')
    .regex(
      /^[^@]+@jbnu\.ac\.kr$/,
      '전북대학교 이메일(@jbnu.ac.kr)을 입력해주세요.',
    ),
  privacyConsent: z.literal('on', {
    error: '개인정보 수집·이용에 동의해주세요.',
  }),
})

export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  studentId: z
    .string()
    .trim()
    .regex(/^\d{9}$/, '학번은 숫자 9자리로 입력해주세요.'),
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요.')
    .max(80, '이름은 80자 이하여야 합니다.'),
})

export function parseSignupForm(formData: FormData) {
  return signupSchema.safeParse({
    signupAttemptId: formData.get('signupAttemptId'),
    studentId: formData.get('studentId'),
    name: formData.get('name'),
    gender: formData.get('gender'),
    schoolEmail: formData.get('schoolEmail'),
    privacyConsent: formData.get('privacyConsent'),
  })
}

export function parseLoginForm(formData: FormData) {
  return loginSchema.safeParse({
    studentId: formData.get('studentId'),
    name: formData.get('name'),
  })
}
