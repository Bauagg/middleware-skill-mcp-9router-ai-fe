export type Role = 'user' | 'admin'

/** Row of m_users as returned by the backend (password is never sent). */
export interface AuthUser {
  id: string
  email: string
  role: Role
}

/** Response of /api/auth/register, /login and /refresh. */
export interface AuthResult {
  user: AuthUser
  access_token: string
  refresh_token: string
  token_type: string
  /** seconds */
  expires_in: number
  /** seconds */
  refresh_expires_in: number
}
