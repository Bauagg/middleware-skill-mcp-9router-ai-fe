import { useState } from 'react'
import { Button, LinearProgress, MenuItem, TextField } from '@mui/material'
import { FolderGit2, PackagePlus, RefreshCw } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import {
  useMcpInstalls,
  useRemoveInstall,
  useStartInstall,
  useStopInstall,
  type InstallStatus,
  type McpInstall,
} from '@/features/mcp-installs/api'
import { InstallFromGithubDialog } from '@/features/mcp-installs/InstallFromGithubDialog'
import { InstallLogsDialog } from '@/features/mcp-installs/InstallLogsDialog'
import { InstallManageCard } from '@/features/mcp-installs/InstallManageCard'
import { useIsAdmin } from '@/stores/authStore'

const statusOptions: { value: '' | InstallStatus; label: string }[] = [
  { value: '', label: 'Semua status' },
  { value: 'running', label: 'Berjalan' },
  { value: 'starting', label: 'Sedang dijalankan' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'pending_review', label: 'Menunggu persetujuan' },
  { value: 'stopped', label: 'Dihentikan' },
  { value: 'failed', label: 'Gagal' },
  { value: 'rejected', label: 'Ditolak' },
]

/** MCP servers installed from GitHub: admins see every install, users their own plus the admin's. */
export function McpInstallsPage() {
  const isAdmin = useIsAdmin()
  const [status, setStatus] = useState<'' | InstallStatus>('')
  const installs = useMcpInstalls(status)
  const start = useStartInstall()
  const stop = useStopInstall()
  const remove = useRemoveInstall()
  const [formOpen, setFormOpen] = useState(false)
  const [logsOf, setLogsOf] = useState<McpInstall | null>(null)
  const [removing, setRemoving] = useState<McpInstall | null>(null)
  const busyId = [start, stop, remove].find((m) => m.isPending)?.variables

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description={
          isAdmin
            ? 'Semua MCP yang dipasang dari GitHub, milik semua user. Tiap MCP berjalan di container Docker terpisah.'
            : 'MCP yang kamu pasang dari GitHub, ditambah MCP dari admin yang bisa kamu pakai. Tiap MCP berjalan di container terpisah.'
        }
        actions={
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RefreshCw size={16} />}
              onClick={() => installs.refetch()}
              disabled={installs.isFetching}
            >
              Muat ulang
            </Button>
            <Button variant="contained" startIcon={<PackagePlus size={16} />} onClick={() => setFormOpen(true)}>
              Pasang dari GitHub
            </Button>
          </>
        }
      />

      <TextField
        select
        size="small"
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as '' | InstallStatus)}
        sx={{ maxWidth: 260 }}
      >
        {statusOptions.map((o) => (
          <MenuItem key={o.value || 'all'} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>

      {installs.isFetching && !installs.isPending && <LinearProgress />}

      {installs.isPending ? (
        <LoadingState />
      ) : installs.isError ? (
        <ErrorState error={installs.error} onRetry={() => installs.refetch()} />
      ) : installs.data.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={status ? 'Tidak ada pemasangan dengan status ini' : 'Belum ada MCP dari GitHub'}
          description="Pasang repo GitHub sebagai MCP lewat tombol di atas, atau minta lewat chat."
          action={
            !status && (
              <Button variant="contained" startIcon={<PackagePlus size={16} />} onClick={() => setFormOpen(true)}>
                Pasang dari GitHub
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {installs.data.map((install) => (
            <InstallManageCard
              key={install.id}
              install={install}
              busy={busyId === install.id}
              onStart={() => start.mutate(install.id)}
              onStop={() => stop.mutate(install.id)}
              onLogs={() => setLogsOf(install)}
              onRemove={() => setRemoving(install)}
            />
          ))}
        </div>
      )}

      <InstallFromGithubDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <InstallLogsDialog install={logsOf} onClose={() => setLogsOf(null)} />
      <ConfirmDialog
        open={!!removing}
        title={removing?.status === 'pending_review' ? `Batalkan pengajuan ${removing.name}?` : `Hapus ${removing?.name ?? ''}?`}
        description={removeDescription(removing, isAdmin)}
        confirmLabel={removing?.status === 'pending_review' ? 'Batalkan pengajuan' : 'Hapus'}
        destructive
        loading={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
      />
    </div>
  )
}

function removeDescription(i: McpInstall | null, isAdmin: boolean): string {
  if (!i) return ''
  if (i.per_user && isAdmin) {
    return 'Ini MCP tanpa sharing. Menghapusnya menghapus template beserta container SEMUA user yang memakainya, dan tool-nya hilang dari chat mereka.'
  }
  if (i.per_user) return 'Container milikmu dan data rahasiamu untuk MCP ini dihapus. Kamu bisa mulai memakainya lagi nanti.'
  if (i.global) return 'MCP ini dipakai bersama semua user. Container, server, dan datanya dihapus untuk semua user.'
  return 'Container, server MCP, dan data rahasianya dihapus. Tool-nya tidak lagi tersedia di chat.'
}
