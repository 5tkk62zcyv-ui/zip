export const DEMO_ADMIN_STUDENT_ID = '123456789'
export const DEMO_ADMIN_NAME = '택시타쉐어관리자'

export function isDemoAdminLoginAllowed(input: {
  studentId: string
  name: string
  nodeEnv: string | undefined
  enabled: string | undefined
}) {
  return (
    input.nodeEnv !== 'production' &&
    input.enabled === 'true' &&
    input.studentId === DEMO_ADMIN_STUDENT_ID &&
    input.name === DEMO_ADMIN_NAME
  )
}
