export type RoutingErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_CONFIGURED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'UPSTREAM_FAILURE'
  | 'MALFORMED_RESPONSE'

export class RoutingError extends Error {
  constructor(
    readonly code: RoutingErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message)
    this.name = 'RoutingError'
  }
}
