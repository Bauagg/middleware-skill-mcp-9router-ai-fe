import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/stores/authStore'

/** The user's own 9Router: the middleware has no 9Router key or model of its own. */
export interface RouterSettings {
  /** e.g. https://domain-9router/v1 → header X-Router-URL */
  url: string
  /** → header X-Router-Key */
  key: string
  /** default model for chat, evals and the fallback skill picker */
  model: string
}

const EMPTY: RouterSettings = { url: '', key: '', model: '' }

interface RouterState {
  /** settings per account, so two people on one browser don't share a key */
  byUser: Record<string, RouterSettings>
  update: (userId: string, patch: Partial<RouterSettings>) => void
}

export const useRouterStore = create<RouterState>()(
  persist(
    (set) => ({
      byUser: {},
      update: (userId, patch) =>
        set((s) => ({ byUser: { ...s.byUser, [userId]: { ...EMPTY, ...s.byUser[userId], ...patch } } })),
    }),
    { name: 'router-settings' },
  ),
)

/** Current account's 9Router settings plus an updater. */
export function useRouterSettings() {
  const userId = useAuthStore((s) => s.user?.id ?? 'anon')
  const settings = useRouterStore((s) => s.byUser[userId]) ?? EMPTY
  const update = useRouterStore((s) => s.update)
  return { ...settings, update: (patch: Partial<RouterSettings>) => update(userId, patch) }
}

/** Address and key are filled in (needed for every call to the user's 9Router). */
export const hasRouterAccess = (s: Pick<RouterSettings, 'url' | 'key'>) => !!(s.url.trim() && s.key.trim())

/** Which of the three required fields are still empty, in form order. */
export function missingRouterFields(s: RouterSettings): string[] {
  const missing: string[] = []
  if (!s.url.trim()) missing.push('alamat')
  if (!s.key.trim()) missing.push('key')
  if (!s.model.trim()) missing.push('model')
  return missing
}

export function routerHeaders(s: Pick<RouterSettings, 'url' | 'key'>): Record<string, string> {
  const headers: Record<string, string> = {}
  if (s.url.trim()) headers['X-Router-URL'] = s.url.trim()
  if (s.key.trim()) headers['X-Router-Key'] = s.key.trim()
  return headers
}

export const isRouterReady = (s: RouterSettings) => hasRouterAccess(s) && s.model.trim() !== ''
