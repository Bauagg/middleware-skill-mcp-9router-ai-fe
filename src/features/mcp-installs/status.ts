import {
  Check,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleStop,
  CircleX,
  Loader,
  type LucideIcon,
} from 'lucide-react'
import type { InstallStatus, McpInstall } from './api'

export const installStatusMeta: Record<
  InstallStatus,
  { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: LucideIcon }
> = {
  pending_review: { label: 'Menunggu persetujuan', color: 'warning', icon: CircleDashed },
  approved: { label: 'Disetujui', color: 'info', icon: Check },
  starting: { label: 'Sedang dijalankan', color: 'info', icon: Loader },
  running: { label: 'Berjalan', color: 'success', icon: CircleCheck },
  failed: { label: 'Gagal', color: 'error', icon: CircleX },
  rejected: { label: 'Ditolak', color: 'default', icon: CircleSlash },
  stopped: { label: 'Dihentikan', color: 'default', icon: CircleStop },
}

/**
 * Status that matters to the viewer. A per_user template (admin install without sharing) has no
 * container itself: what counts is the viewer's own instance, or null when they haven't started it.
 */
export function effectiveStatus(i: McpInstall): InstallStatus | null {
  if (i.per_user) return i.my_instance?.status ?? null
  return i.status
}

/** Still moving on its own (approved → starting → running): worth polling. */
export function isInProgress(i: McpInstall): boolean {
  const s = effectiveStatus(i)
  return s === 'approved' || s === 'starting'
}
