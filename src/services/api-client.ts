type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type Fetch = typeof fetch

const UNAVAILABLE_MESSAGE = 'No pudimos completar la operación. Inténtalo de nuevo.'

// The backend answers every failure with `{ error, code }` (backend/src/middlewares/error.middleware.ts).
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Calls the CALM API as the signed-in admin: her Supabase session token goes as a Bearer token.
export class ApiClient {
  private readonly baseUrl: string
  private readonly accessToken: () => Promise<string | undefined>
  private readonly fetch: Fetch

  // The default calls the global fetch directly: browsers refuse fetch with any other `this`
  // ("Illegal invocation"), which a stored `this.fetch(...)` call would pass.
  constructor(
    baseUrl: string,
    accessToken: () => Promise<string | undefined>,
    fetchFn: Fetch = (input, init) => fetch(input, init),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.accessToken = accessToken
    this.fetch = fetchFn
  }

  // The answer's JSON is trusted to be T: the API is ours and its tests pin the shapes.
  async json<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const response = await this.send(method, path, body)
    return response.json()
  }

  // Throws an ApiError when the API refuses; the caller reads the answer only if it needs it.
  async send(method: HttpMethod, path: string, body?: unknown): Promise<Response> {
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers: await this.headersFor(body),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) throw await apiErrorOf(response)
    return response
  }

  private async headersFor(body: unknown): Promise<Headers> {
    const headers = new Headers()
    const token = await this.accessToken()
    if (token !== undefined) headers.set('Authorization', `Bearer ${token}`)
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    return headers
  }
}

async function apiErrorOf(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => undefined)
  if (isErrorBody(body)) return new ApiError(response.status, body.code, body.error)
  return new ApiError(response.status, 'unavailable', UNAVAILABLE_MESSAGE)
}

function isErrorBody(body: unknown): body is { error: string; code: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string' &&
    'code' in body &&
    typeof body.code === 'string'
  )
}
