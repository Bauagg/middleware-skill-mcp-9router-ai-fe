import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResult, AuthUser } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  /** epoch ms when the access token expires */
  accessExpiresAt: number | null
  setSession: (result: AuthResult) => void
  setUser: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      setSession: (r) =>
        set({
          user: r.user,
          accessToken: r.access_token,
          refreshToken: r.refresh_token,
          accessExpiresAt: Date.now() + r.expires_in * 1000,
        }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, accessExpiresAt: null }),
    }),
    // v1: real JWT session (v0 held the old stub token and is discarded)
    { name: 'auth', version: 1, migrate: () => ({ user: null, accessToken: null, refreshToken: null, accessExpiresAt: null }) },
  ),
)

export const useIsAdmin = () => useAuthStore((s) => s.user?.role === 'admin')
