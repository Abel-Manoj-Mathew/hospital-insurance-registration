// Unset in production: the app is served behind the same reverse proxy (Caddy) as the
// API, so relative paths like `/api/...` resolve same-origin with no CORS involved.
// Only local dev (frontend on :5173, API on :4000) needs this set to an absolute URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    throw new ApiError(response.status, body.error ?? 'request_failed')
  }

  return response.json() as Promise<T>
}
