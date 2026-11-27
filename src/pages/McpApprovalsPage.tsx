import { useState } from 'react'
import { Badge, Button, LinearProgress, Tab, Tabs } from '@mui/material'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import { envLabel, useApproveMcpInstall, useMcpInstalls, type McpInstall } from '@/features/mcp-installs/api'
import { InstallReviewCard } from '@/features/mcp-installs/InstallReviewCard'
import { RejectInstallDialog } from '@/features/mcp-installs/RejectInstallDialog'

type TabValue = 'pending_review' | 'rejected' | ''

const tabs: { value: TabValue; label: string }[] = [
  { value: 'pending_review', label: 'Menunggu' },
  { value: 'rejected', label: 'Ditolak' },
  { value: '', label: 'Semua' },
]

const emptyText: Record<TabValue, { title: string; description: string }> = {
  pending_review: {
    title: 'Tidak ada pengajuan yang menunggu',
    description: 'Pengajuan muncul di sini saat user meminta lewat chat untuk memasang repo GitHub sebagai MCP.',
  },
  rejected: { title: 'Belum ada yang ditolak', description: 'Pengajuan yang kamu tolak bisa disetujui ulang dari sini.' },
  '': { title: 'Belum ada pemasangan MCP', description: 'Pemasangan MCP dari GitHub milik semua user tampil di sini.' },
}

/** Admin-only: review MCP servers that users asked to install from GitHub. */
export function McpApprovalsPage() {
  const [tab, setTab] = useState<TabValue>('pending_review')
  const installs = useMcpInstalls(tab)
  const pendingCount = useMcpInstalls('pending_review').data?.length ?? 0
  const approve = useApproveMcpInstall()
  const [approving, setApproving] = useState<McpInstall | null>(null)
  const [rejecting, setRejecting] = useState<McpInstall | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Pengajuan pemasangan MCP dari GitHub. Baca repo, commit, dan perintahnya sebelum menyetujui: setelah disetujui, kode itu di-clone dan dijalankan di container terpisah."
        actions={
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RefreshCw size={16} />}
            onClick={() => installs.refetch()}
            disabled={installs.isFetching}
          >
            Muat ulang
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        {tabs.map((t) => (
          <Tab
            key={t.value || 'all'}
            value={t.value}
            label={
              t.value === 'pending_review' && pendingCount > 0 ? (
                <Badge badgeContent={pendingCount} color="warning" sx={{ '& .MuiBadge-badge': { right: -12 } }}>
                  {t.label}
                </Badge>
              ) : (
                t.label
              )
            }
            sx={t.value === 'pending_review' && pendingCount > 0 ? { pr: 3.5 } : undefined}
          />
        ))}
      </Tabs>

      {installs.isFetching && !installs.isPending && <LinearProgress />}

      {installs.isPending ? (
        <LoadingState />
      ) : installs.isError ? (
        <ErrorState error={installs.error} onRetry={() => installs.refetch()} />
      ) : installs.data.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={emptyText[tab].title} description={emptyText[tab].description} />
      ) : (
        <div className="flex flex-col gap-4">
          {installs.data.map((install) => (
            <InstallReviewCard
              key={install.id}
              install={install}
              busy={approve.isPending && approve.variables === install.id}
              onApprove={() => setApproving(install)}
              onReject={() => setRejecting(install)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!approving}
        title={`Setujui pemasangan ${approving?.name ?? ''}?`}
        description={
          approving && (
            <span className="flex flex-col gap-2">
              <span>
                Commit <b className="font-mono">{approving.commit_sha.slice(0, 12)}</b> dari{' '}
                <b>
                  {approving.owner}/{approving.repo}
                </b>{' '}
                akan di-clone, di-install, dan dijalankan di container terpisah, lalu tool-nya tersedia di chat milik
                user yang mengajukan.
              </span>
              {(approving.env_missing?.length ?? 0) > 0 && (
                <span>
                  Data rahasia belum lengkap ({approving.env_missing!.map((k) => envLabel(approving, k)).join(', ')}). Container baru berjalan setelah user
                  mengisinya lewat link form.
                </span>
              )}
            </span>
          )
        }
        confirmLabel="Setujui"
        loading={approve.isPending}
        onClose={() => setApproving(null)}
        onConfirm={() => approving && approve.mutate(approving.id, { onSuccess: () => setApproving(null) })}
      />
      <RejectInstallDialog install={rejecting} onClose={() => setRejecting(null)} />
    </div>
  )
}
