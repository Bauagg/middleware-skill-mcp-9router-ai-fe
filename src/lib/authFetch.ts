import { getAccessToken, refreshAccessToken } from '@/lib/axios'

/**
 * fetch() with the login token, for calls axios can't do well (SSE streaming on /v1).
 * On a 401 caused by an expired token it refreshes once and retries.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, { ...init, headers })
  }

  const res = await send(await getAccessToken())
  if (res.status !== 401) return res

  // only retry when the token itself was rejected (not e.g. a missing 9Router key)
  const body = (await res.clone().json().catch(() => null)) as { error?: { type?: string } } | null
  if (body?.error?.type !== 'invalid_token') return res
  const token = await refreshAccessToken()
  return token ? send(token) : res
}
