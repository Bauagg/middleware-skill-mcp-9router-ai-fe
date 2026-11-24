import { Alert, Button, Chip, Link, Paper, Typography } from '@mui/material'
import { ExternalLink, FileKey, GitCommitHorizontal, Play, ScrollText, ShieldCheck, Square, Trash2 } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { OwnerChip } from '@/components/common/OwnerChip'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'
import type { McpInstall } from './api'
import { effectiveStatus, installStatusMeta } from './status'

interface Props {
  install: McpInstall
  busy?: boolean
  onStart: () => void
  onStop: () => void
  onLogs: () => void
  onRemove: () => void
}

/** One MCP install with the actions the viewer is allowed to take on it. */
export function InstallManageCard({ install: i, busy, onStart, onStop, onLogs, onRemove }: Props) {
  const me = useAuthStore((s) => s.user)
  const isAdmin = me?.role === 'admin'
  const owns = isAdmin || i.user_id === me?.id
  const status = effectiveStatus(i)
  const meta = status ? installStatusMeta[status] : null
  const StatusIcon = meta?.icon
  const reviewed = i.status !== 'pending_review' && i.status !== 'rejected'

  // per_user template: everyone manages their own container; otherwise only the owner or an admin
  const canManage = i.per_user || owns
  const running = status === 'running' || status === 'starting'
  const hasContainer = status !== null && status !== 'pending_review' && status !== 'rejected'
  const canStart = canManage && reviewed && !running && (!i.per_user || (i.env_missing?.length ?? 0) === 0)
  const canStop = canManage && running
  const canLogs = canManage && hasContainer
  // a per_user template can only be "removed" by a user once they have their own container
  const canRemove = i.per_user ? isAdmin || !!i.my_instance : owns
  const envMissing = i.env_missing ?? []
  const envKeys = i.env_keys ?? []

  return (
    <Paper variant="outlined" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Typography sx={{ fontWeight: 700, fontSize: 17 }} className="mr-auto font-mono">
          {i.name}
        </Typography>
        <OwnerChip userId={i.user_id} />
        {i.global && (
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={i.per_user ? 'Dari admin · tiap user container sendiri' : 'Dari admin · dipakai bersama'}
          />
        )}
        {meta && StatusIcon ? (
          <Chip
            size="small"
            color={meta.color}
            icon={<StatusIcon size={14} className={status === 'starting' ? 'animate-spin' : undefined} />}
            label={meta.label}
          />
        ) : (
          <Chip size="small" variant="outlined" label="Belum kamu pakai" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link href={i.repo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
          {i.owner}/{i.repo}
          <ExternalLink size={14} />
        </Link>
        <span className="inline-flex items-center gap-1 font-mono" title="Commit yang dijalankan">
          <GitCommitHorizontal size={14} />
          {i.commit_sha.slice(0, 12)}
        </span>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {i.transport === 'http' ? `http ${i.http_path}` : 'stdio'} · diajukan {formatDateTime(i.created_at)}
        </Typography>
      </div>

      {i.purpose && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} className="line-clamp-2">
          {i.purpose}
        </Typography>
      )}

      {envKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
            Data rahasia:
          </Typography>
          {envKeys.map((k) => (
            <Chip
              key={k}
              size="small"
              variant="outlined"
              className="font-mono"
              color={envMissing.includes(k) ? 'warning' : 'default'}
              label={`${k}${envMissing.includes(k) ? ' · belum diisi' : ''}`}
            />
          ))}
        </div>
      )}

      {i.status === 'pending_review' && (
        <Alert severity="info">
          Menunggu persetujuan admin.
          {isAdmin && (
            <>
              {' '}
              <Link component={RouterLink} to="/mcp-approvals">
                Tinjau di Persetujuan MCP
              </Link>
            </>
          )}
        </Alert>
      )}
      {i.status === 'rejected' && i.error && <Alert severity="info">Ditolak admin: {i.error}</Alert>}
      {i.status === 'failed' && i.error && <Alert severity="error">{i.error}</Alert>}
      {i.my_instance?.status === 'failed' && i.my_instance.error && <Alert severity="error">{i.my_instance.error}</Alert>}
      {i.per_user && !i.my_instance && envMissing.length > 0 && (
        <Alert severity="info">Isi data rahasia milikmu untuk mulai memakai MCP ini. Container-mu langsung dijalankan setelahnya.</Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {i.env_url && envKeys.length > 0 && (
          <Button
            size="small"
            variant={envMissing.length > 0 ? 'contained' : 'outlined'}
            startIcon={<FileKey size={16} />}
            href={i.env_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {envMissing.length > 0 ? 'Isi data rahasia' : 'Ubah data rahasia'}
          </Button>
        )}
        {canStart && (
          <Button size="small" variant="outlined" startIcon={<Play size={16} />} onClick={onStart} disabled={busy}>
            {i.per_user && !i.my_instance ? 'Mulai pakai' : 'Jalankan'}
          </Button>
        )}
        {canStop && (
          <Button size="small" variant="outlined" color="inherit" startIcon={<Square size={16} />} onClick={onStop} disabled={busy}>
            Hentikan
          </Button>
        )}
        {canLogs && (
          <Button size="small" color="inherit" startIcon={<ScrollText size={16} />} onClick={onLogs}>
            Log
          </Button>
        )}
        {isAdmin && i.status === 'pending_review' && (
          <Button size="small" component={RouterLink} to="/mcp-approvals" startIcon={<ShieldCheck size={16} />}>
            Tinjau
          </Button>
        )}
        {canRemove && (
          <Button size="small" color="error" startIcon={<Trash2 size={16} />} onClick={onRemove} disabled={busy} sx={{ ml: 'auto' }}>
            {i.status === 'pending_review' ? 'Batalkan' : 'Hapus'}
          </Button>
        )}
      </div>
    </Paper>
  )
}
