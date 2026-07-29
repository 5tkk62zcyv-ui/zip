import { z } from 'zod'

export const genderValues = ['female', 'male'] as const

export const signupSchema = z.object({
  signupAttemptId: z.uuid('가입 요청 식별자가 올바르지 않습니다.'),
  studentId: z
    .string()
    .trim()
    .min(1, '학번을 입력해주세요.')
    .max(32, '학번은 32자 이하여야 합니다.')
    .regex(/^[A-Za-z0-9-]+$/, '학번은 영문, 숫자, 하이픈만 사용할 수 있어요.'),
  name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요.')
    .max(80, '이름은 80자 이하여야 합니다.'),
  gender: z.enum(genderValues, {
    error: '성별을 선택해주세요.',
  }),
  schoolEmail: z
    .email('올바른 학교 이메일을 입력해주세요.')
    .max(320, '이메일이 너무 깁니다.')
    .transform((value) => value.trim().toLowerCase()),
  privacyConsent: z.literal('on', {
    error: '개인정보 수집·이용에 동의해주세요.',
  }),
})

export type SignupInput = z.infer<typeof signupSchema>

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
