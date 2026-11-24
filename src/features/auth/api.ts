import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api, getData } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import type { ApiResponse } from '@/types/api'
import type { AuthResult, AuthUser } from '@/types/auth'

const email = z.string().trim().min(1, 'Email wajib diisi').max(254, 'Maksimal 254 karakter').email('Format email tidak valid')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password wajib diisi').max(72, 'Maksimal 72 karakter'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    email,
    password: z.string().min(8, 'Minimal 8 karakter').max(72, 'Maksimal 72 karakter'),
    confirmPassword: z.string().min(1, 'Ulangi password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Password tidak sama',
  })
export type RegisterInput = z.infer<typeof registerSchema>

export async function loginRequest(input: LoginInput): Promise<AuthResult> {
  const res = await api.post<ApiResponse<AuthResult>>('/auth/login', input)
  return res.data.data
}

/** Register always creates role "user"; admins are created on the backend (.env / Postman). */
export async function registerRequest({ email, password }: RegisterInput): Promise<AuthResult> {
  const res = await api.post<ApiResponse<AuthResult>>('/auth/register', { email, password })
  return res.data.data
}

/** Re-reads the account so a role change on the backend shows up without logging in again. */
export function useMe() {
  const hasToken = useAuthStore((s) => !!s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await getData<AuthUser>('/auth/me')
      setUser(user)
      return user
    },
    enabled: hasToken,
    staleTime: 5 * 60_000,
  })
}
