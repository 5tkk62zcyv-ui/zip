import { describe, expect, it } from 'vitest'
import { RoutingError } from './errors'
import { routingErrorMessage, routingErrorStatus } from './response'

describe('routing error response normalization', () => {
  it.each([
    ['INVALID_INPUT', 400],
    ['NOT_FOUND', 404],
    ['NOT_CONFIGURED', 503],
    ['TIMEOUT', 502],
    ['UPSTREAM_FAILURE', 502],
    ['MALFORMED_RESPONSE', 502],
  ] as const)('maps %s to %i', (code, status) => {
    const error = new RoutingError(code, 'upstream detail')
    expect(routingErrorStatus(error)).toBe(status)
  })

  it('does not expose an upstream error message', () => {
    const error = new RoutingError(
      'UPSTREAM_FAILURE',
      'secret upstream payload',
    )
    expect(routingErrorMessage(error)).not.toContain('secret')
  })
})
