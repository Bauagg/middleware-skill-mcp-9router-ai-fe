import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMe } from '@/features/auth/api'
import { useAuthStore } from '@/stores/authStore'

/** Sends signed-out users to /login, remembering where they were going. */
export function RequireAuth() {
  const token = useAuthStore((s) => s.accessToken)
  const location = useLocation()
  // keep role/email in sync with the backend (refreshes the token if it expired)
  useMe()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Admin-only pages. The backend also answers 403, this just keeps users off a page they can't use. */
export function RequireAdmin() {
  const role = useAuthStore((s) => s.user?.role)
  return role === 'admin' ? <Outlet /> : <Navigate to="/" replace />
}

/** Keeps signed-in users away from the login and register pages. */
export function GuestOnly() {
  const token = useAuthStore((s) => s.accessToken)
  return token ? <Navigate to="/" replace /> : <Outlet />
}
