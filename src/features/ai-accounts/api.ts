import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getData } from '@/lib/axios'
import { notify } from '@/lib/notify'
import type { ApiResponse } from '@/types/api'

/** How a provider's accounts are connected: sign-in in the server browser, or a pasted API key. */
export type AIAuth = 'browser' | 'api_key'

/** One kind of AI service the middleware can talk to (built into the backend). */
export interface AIDriver {
  key: string
  name: string
  description: string
  auth: AIAuth
  /** answers chat when the user's 9Router is exhausted or failing */
  text: boolean
  image: boolean
  video: boolean
  /** extra remark for users, e.g. a feature that is not ready yet */
  note?: string
  login_url?: string
  cookie_domains?: string[]
  /** one of these cookies proves the sign-in; a trailing "*" matches a prefix */
  session_cookies?: string[]
  needs_base_url: boolean
  /** admin fills a chat model and/or an image model; a capability without its model is not used */
  model_fields: boolean
  /** one provider is created automatically and cannot be deleted */
  builtin: boolean
}

/** An AI service users can connect accounts to (m_ai_providers). Only admins change these. */
export interface AIProvider {
  id: string
  driver: string
  name: string
  enabled: boolean
  /** lower is tried first */
  priority: number
  /** overrides the driver's sign-in page; empty = default */
  login_url: string
  base_url: string
  chat_model: string
  image_model: string
  created_at: string
  updated_at: string
  driver_info: AIDriver
}

export type AIAccountStatus = 'unchecked' | 'ok' | 'needs_login' | 'error'

/** A user's account at a provider whose quota makes that user's images and videos (m_ai_accounts). Secrets are never returned. */
export interface AIAccount {
  id: string
  /** owner; an account is only ever used for its owner's requests */
  user_id: string
  provider_id: string
  name: string
  /** 0 for API-key accounts */
  cookie_count: number
  enabled: boolean
  /** lower is tried first, within its provider */
  priority: number
  status: AIAccountStatus
  last_error: string
  /** skipped for chat/images/videos until then, after the account ran out of quota */
  chat_cooldown_until: string | null
  image_cooldown_until: string | null
  video_cooldown_until: string | null
  /** chat answers given while 9Router was exhausted */
  chats: number
  images: number
  videos: number
  last_used_at: string | null
  last_checked_at: string | null
  /** last time the provider renewed the session: a sign it is alive */
  cookies_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateAccountInput {
  provider_id: string
  name: string
  /** browser providers: Cookie header, a cookie-extension JSON export, or cookies.txt */
  cookies?: string
  /** API-key providers */
  api_key?: string
}

export interface UpdateAccountInput {
  name?: string
  cookies?: string
  api_key?: string
  enabled?: boolean
  priority?: number
}

export interface ProviderInput {
  driver?: string
  name?: string
  enabled?: boolean
  priority?: number
  login_url?: string
  base_url?: string
  chat_model?: string
  image_model?: string
}

export const aiKeys = {
  all: ['ai-accounts'] as const,
  accounts: ['ai-accounts', 'accounts'] as const,
  providers: ['ai-accounts', 'providers'] as const,
  drivers: ['ai-accounts', 'drivers'] as const,
}

export function useAIDrivers() {
  return useQuery({
    queryKey: aiKeys.drivers,
    queryFn: () => getData<AIDriver[]>('/ai/drivers'),
    staleTime: Infinity,
  })
}

/** Enabled providers (admins: all), ordered by priority. */
export function useAIProviders() {
  return useQuery({
    queryKey: aiKeys.providers,
    queryFn: () => getData<AIProvider[]>('/ai/providers'),
  })
}

/** The viewer's accounts (admins: every user's). */
export function useAIAccounts() {
  return useQuery({
    queryKey: aiKeys.accounts,
    queryFn: () => getData<AIAccount[]>('/ai/accounts'),
  })
}

function useAIMutation<TVars>(fn: (vars: TVars) => Promise<ApiResponse<unknown>>, silent = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: silent ? { silent: true } : undefined,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: aiKeys.all })
    },
  })
}

// adding or replacing a secret checks the session with the provider right away, which can take a while
const CHECK_TIMEOUT = 60_000

/** The dialog shows the error inline (e.g. cookies without the session cookie). */
export const useCreateAIAccount = () =>
  useAIMutation(
    async (input: CreateAccountInput) =>
      (await api.post<ApiResponse<AIAccount>>('/ai/accounts', input, { timeout: CHECK_TIMEOUT })).data,
    true,
  )

export const useUpdateAIAccount = (silent = false) =>
  useAIMutation(
    async ({ id, ...input }: UpdateAccountInput & { id: string }) =>
      (await api.patch<ApiResponse<AIAccount>>(`/ai/accounts/${id}`, input, { timeout: CHECK_TIMEOUT })).data,
    silent,
  )

export const useDeleteAIAccount = () =>
  useAIMutation(async (id: string) => (await api.delete<ApiResponse<null>>(`/ai/accounts/${id}`)).data)

/** Opens a fresh session from the stored secret; the result lands in status/last_error. */
export const useCheckAIAccount = () =>
  useAIMutation(
    async (id: string) =>
      (await api.post<ApiResponse<AIAccount>>(`/ai/accounts/${id}/check`, null, { timeout: CHECK_TIMEOUT })).data,
  )

/** Use the account again right away, even though it recently ran out of quota. */
export const useResetAICooldown = () =>
  useAIMutation(async (id: string) => (await api.post<ApiResponse<AIAccount>>(`/ai/accounts/${id}/reset-cooldown`)).data)

/** Save a new try-order: each item's priority becomes its position. */
export function useReorder(kind: 'accounts' | 'providers') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (changes: { id: string; priority: number }[]) => {
      for (const c of changes) await api.patch(`/ai/${kind}/${c.id}`, { priority: c.priority })
    },
    onSuccess: () => {
      notify.success('Urutan disimpan')
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: aiKeys.all })
    },
  })
}

// --- providers (admin) ---

/** The dialog shows the error inline. */
export const useCreateAIProvider = () =>
  useAIMutation(async (input: ProviderInput) => (await api.post<ApiResponse<AIProvider>>('/ai/providers', input)).data, true)

export const useUpdateAIProvider = (silent = false) =>
  useAIMutation(
    async ({ id, ...input }: ProviderInput & { id: string }) =>
      (await api.patch<ApiResponse<AIProvider>>(`/ai/providers/${id}`, input)).data,
    silent,
  )

export const useDeleteAIProvider = () =>
  useAIMutation(async (id: string) => (await api.delete<ApiResponse<null>>(`/ai/providers/${id}`)).data)

// --- sign-in through the browser on the server ---

/** Sign-in through the browser on the server, shown in the page over noVNC. */
export interface AILogin {
  id: string
  /** WebSocket path of the browser screen, ticket included */
  vnc_path: string
  expires_at: string
  /** the server saves the account by itself as soon as the sign-in completes */
  state: 'waiting' | 'saving' | 'saved' | 'failed'
  account?: AIAccount
  error?: string
}

/** Whether the sign-in browser (service login-browser) is running. */
export function useLoginAvailable() {
  return useQuery({
    queryKey: [...aiKeys.all, 'login-available'],
    queryFn: () => getData<{ available: boolean }>('/ai/login'),
    select: (d) => d.available,
  })
}

/** Opens the provider's sign-in page in a fresh, throwaway browser window (like Incognito). */
export function useStartLogin() {
  return useMutation({
    mutationFn: async (target: { provider_id: string } | { account_id: string }) =>
      (await api.post<ApiResponse<AILogin>>('/ai/login', target)).data.data,
    meta: { silent: true },
  })
}

/** Polls a sign-in until the server has saved the account (or failed). */
export function useLoginState(id: string | undefined) {
  return useQuery({
    queryKey: [...aiKeys.all, 'login', id],
    queryFn: () => getData<AILogin>(`/ai/login/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.state === 'saved' || q.state.data?.state === 'failed' ? false : 2000),
    meta: { silent: true },
  })
}

/** Closes the sign-in window without saving. Fire-and-forget: the server also drops it after 15 minutes. */
export function cancelLogin(id: string) {
  void api.delete(`/ai/login/${id}`).catch(() => undefined)
}

/** Absolute WebSocket URL of the browser screen, on the same host as the page (dev server proxies /api). */
export function vncUrl(path: string) {
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${path}`
}

/** The cooldown end if it is still in the future. */
export function activeCooldown(until: string | null): Date | null {
  if (!until) return null
  const d = new Date(until)
  return d.getTime() > Date.now() ? d : null
}

/** Session cookie names without the prefix marker, for messages. */
export function sessionCookieLabel(d: AIDriver) {
  return (d.session_cookies ?? []).map((c) => c.replace(/\*$/, '')).join(' / ')
}

/** Whether pasted cookies look like they contain the provider's session cookie. */
export function hasSessionCookie(d: AIDriver, raw: string) {
  return (d.session_cookies ?? []).some((c) => raw.includes(c.replace(/\*$/, '')))
}
