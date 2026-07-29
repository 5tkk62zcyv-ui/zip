const validEnvironments = new Set(['development', 'preview', 'production'])

export function assertEnvironmentConfiguration(environment: {
  APP_ENVIRONMENT?: string
  VERCEL_ENV?: string
}) {
  const appEnvironment = environment.APP_ENVIRONMENT

  if (!appEnvironment || !validEnvironments.has(appEnvironment)) {
    throw new Error(
      'APP_ENVIRONMENT must be development, preview, or production.',
    )
  }

  if (
    environment.VERCEL_ENV &&
    environment.VERCEL_ENV !== appEnvironment
  ) {
    throw new Error(
      `Environment mismatch: APP_ENVIRONMENT=${appEnvironment}, VERCEL_ENV=${environment.VERCEL_ENV}.`,
    )
  }
}
