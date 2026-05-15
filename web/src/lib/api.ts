export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
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
    throw new ApiError(
      res.status,
      errBody?.code ?? 'unknown',
      errBody?.message ?? res.statusText,
    )
  }

  return body as T
}
