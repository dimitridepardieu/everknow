export class ApiError extends Error {
  readonly status: number
  readonly code: string
  // Seconds to wait, from the Retry-After header, when the server sent one.
  readonly retryAfter?: number

  constructor(
    status: number,
    code: string,
    message: string,
    retryAfter?: number,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
    this.name = 'ApiError'
  }
}

interface ApiErrorBody {
  code: string
  message: string
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (res.status === 204) {
    return undefined as T
  }

  const isJson = res.headers.get('Content-Type')?.includes('application/json')
  const body = isJson ? await res.json() : null

  if (!res.ok) {
    const errBody = body as ApiErrorBody | null
    // RFC 9110 also allows an HTTP-date here; the API only ever sends
    // delay-seconds, so anything unparseable is dropped rather than guessed.
    const retryAfter = Number(res.headers.get('Retry-After'))
    throw new ApiError(
      res.status,
      errBody?.code ?? 'unknown',
      errBody?.message ?? res.statusText,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    )
  }

  return body as T
}
