import { describe, expect, it } from 'vitest'
import { assertEnvironmentConfiguration } from './environment'

describe('assertEnvironmentConfiguration', () => {
  it.each(['development', 'preview', 'production'])(
    'accepts %s',
    (environment) => {
      expect(() =>
        assertEnvironmentConfiguration({
          APP_ENVIRONMENT: environment,
          VERCEL_ENV: environment,
        }),
      ).not.toThrow()
    },
  )

  it('rejects missing app environment', () => {
    expect(() => assertEnvironmentConfiguration({})).toThrow(
      'APP_ENVIRONMENT',
    )
  })

  it('rejects a Vercel environment mismatch', () => {
    expect(() =>
      assertEnvironmentConfiguration({
        APP_ENVIRONMENT: 'preview',
        VERCEL_ENV: 'production',
      }),
    ).toThrow('Environment mismatch')
  })
})
