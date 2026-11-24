import { Chip, Tooltip } from '@mui/material'
import { UserRound } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

/**
 * Who owns a row. Only admins see data of other users, so for regular users this renders nothing.
 * user_id is a login UUID or a third-party id (X-User-Id).
 */
export function OwnerChip({ userId }: { userId?: string | null }) {
  const me = useAuthStore((s) => s.user)
  if (me?.role !== 'admin' || !userId) return null

  const mine = userId === me.id
  const short = userId.length > 14 ? `${userId.slice(0, 8)}…` : userId
  return (
    <Tooltip title={mine ? 'Milikmu' : `Milik user ${userId}`}>
      <Chip
        size="small"
        variant="outlined"
        icon={<UserRound size={13} />}
        label={mine ? 'Kamu' : short}
        className={mine ? undefined : 'font-mono'}
      />
    </Tooltip>
  )
}
