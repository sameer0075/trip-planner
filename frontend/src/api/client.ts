const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api').replace(
  /\/$/,
  '',
)

type FieldErrors = Record<string, unknown>

/** An error response from the API, normalised from its `{"error": {...}}` envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: FieldErrors

  constructor(status: number, code: string, message: string, details?: FieldErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  query?: Record<string, string | number>
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, String(value))
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection.')
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) throw toApiError(response.status, payload)
  return payload as T
}

function toApiError(status: number, payload: unknown): ApiError {
  const error = (payload as { error?: { code?: string; message?: string; details?: FieldErrors } })
    ?.error
  return new ApiError(
    status,
    error?.code ?? 'http_error',
    error?.message ?? `The server responded with an error (${status}).`,
    error?.details,
  )
}

/** Flattens DRF-style field errors into readable sentences, e.g. "Pickup location: ...". */
export function describeFieldErrors(details: FieldErrors | undefined): string[] {
  if (!details) return []
  return Object.entries(details).flatMap(([field, value]) => {
    const name = field.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    return flattenMessages(value).map((message) =>
      field === 'non_field_errors' ? message : `${name}: ${message}`,
    )
  })
}

function flattenMessages(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flattenMessages)
  if (value && typeof value === 'object') return Object.values(value).flatMap(flattenMessages)
  return []
}
