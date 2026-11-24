import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import type { ApiFieldError, ApiResponse } from '@/types/api'
import type { AuthResult } from '@/types/auth'

// No default Content-Type: axios picks JSON for objects and multipart (with boundary) for FormData.
export const api = axios.create({
  baseURL: '/api',
  timeout: 60_000, // AI calls can be slow
})

/** Bare client without interceptors, used for the refresh call itself. */
const bare = axios.create({ baseURL: '/api', timeout: 30_000 })

/** Endpoints that never carry the access token. */
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh']
const isPublic = (url?: string) => PUBLIC_PATHS.some((p) => url?.startsWith(p))

let refreshing: Promise<string | null> | null = null

/**
 * Trade the refresh token for a new token pair. Concurrent callers share one request.
 * Logs the user out when the backend rejects the refresh token; a network error keeps the session.
 */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const { refreshToken, setSession, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      return null
    }
    try {
      const res = await bare.post<ApiResponse<AuthResult>>('/auth/refresh', { refresh_token: refreshToken })
      setSession(res.data.data)
      return res.data.data.access_token
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status === 400 || status === 401) logout()
      return null
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** An access token valid for at least 30 more seconds, refreshing it first when needed. */
export async function getAccessToken(): Promise<string | null> {
  const { accessToken, accessExpiresAt, refreshToken } = useAuthStore.getState()
  if (!accessToken) return null
  if (accessExpiresAt && accessExpiresAt - Date.now() > 30_000) return accessToken
  if (!refreshToken) return accessToken
  return (await refreshAccessToken()) ?? null
}

api.interceptors.request.use(async (config) => {
  if (!isPublic(config.url)) {
    const token = await getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    // expired/invalid access token: refresh once and replay the request
    if (error.response?.status === 401 && config && !config._retried && !isPublic(config.url)) {
      config._retried = true
      const token = await refreshAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        return api(config)
      }
    }
    return Promise.reject(error)
  },
)

/** GET an `/api/*` endpoint and return the envelope's `data`. */
export async function getData<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<ApiResponse<T>>(url, config)
  return res.data.data
}

type ErrorBody = {
  message?: string
  errors?: ApiFieldError[]
  error?: string | { message?: string }
}

/** Pull a readable message out of an axios/fetch error (or anything else). */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ErrorBody | undefined
    if (data?.message) {
      const fields = data.errors?.map((e) => `${e.field} ${e.message}`).join('; ')
      return fields ? `${data.message}: ${fields}` : data.message
    }
    // /v1/* uses the OpenAI shape { error: { message } } (sometimes { error: "..." })
    if (typeof data?.error === 'string') return data.error
    if (data?.error?.message) return data.error.message
    if (error.code === 'ERR_NETWORK') return 'Tidak bisa terhubung ke backend'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Terjadi kesalahan'
}
