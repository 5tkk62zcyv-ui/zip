import { RoutingError } from './errors'

const REQUEST_TIMEOUT_MS = 8_000

export async function fetchJson(
  url: URL | string,
  init: RequestInit = {},
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')
    ) {
      throw new RoutingError(
        'TIMEOUT',
        '지도 공급자 응답 시간이 초과되었습니다.',
        true,
      )
    }
    throw new RoutingError(
      'UPSTREAM_FAILURE',
      '지도 공급자에 연결하지 못했습니다.',
      true,
    )
  }

  if (!response.ok) {
    throw new RoutingError(
      'UPSTREAM_FAILURE',
      '지도 공급자 요청을 처리하지 못했습니다.',
      response.status === 429 || response.status >= 500,
    )
  }

  try {
    return await response.json()
  } catch {
    throw new RoutingError(
      'MALFORMED_RESPONSE',
      '지도 공급자 응답 형식이 올바르지 않습니다.',
      true,
    )
  }
}
