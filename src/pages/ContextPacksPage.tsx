import { useState } from 'react'
import { Alert, Button, Chip, IconButton, Paper, Switch, Tooltip, Typography } from '@mui/material'
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { OwnerChip } from '@/components/common/OwnerChip'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import {
  useContextPacks,
  useDeleteContextPack,
  useUpdateContextPack,
  type ContextPack,
} from '@/features/context-packs/api'
import { ContextPackDialog } from '@/features/context-packs/ContextPackDialog'
import { estimateTokens, formatDateTime, formatNumber } from '@/lib/format'

/** Backend default CONTEXT_PACK_MAX_TOKENS. */
const MAX_TOKENS = 800

export function ContextPacksPage() {
  const packs = useContextPacks()
  const update = useUpdateContextPack()
  const remove = useDeleteContextPack()
  const [editing, setEditing] = useState<ContextPack | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<ContextPack | null>(null)

  const activeTokens = (packs.data ?? []).filter((p) => p.active).reduce((sum, p) => sum + estimateTokens(p.content), 0)

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Fakta tetap (profil bisnis, istilah, aturan) yang disisipkan ke setiap request. Jaga tetap singkat karena menambah token di setiap chat."
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>
            Context pack baru
          </Button>
        }
      />

      {packs.data && packs.data.length > 0 && (
        <Alert severity={activeTokens > MAX_TOKENS ? 'warning' : 'info'}>
          Total pack aktif ± {formatNumber(activeTokens)} token
          {activeTokens > MAX_TOKENS
            ? `, melebihi batas bawaan ${MAX_TOKENS} token. Sisanya akan dipotong.`
            : ` dari batas bawaan ${MAX_TOKENS} token.`}
        </Alert>
      )}

      {packs.isPending ? (
        <LoadingState />
      ) : packs.isError ? (
        <ErrorState error={packs.error} onRetry={() => packs.refetch()} />
      ) : packs.data.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Belum ada context pack"
          description="Contoh: profil bisnis singkat supaya model selalu tahu konteks usaha kamu."
          action={
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreate}>
              Buat context pack
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {packs.data.map((pack) => (
            <Paper key={pack.id} variant="outlined" className="flex flex-col gap-3 p-4" sx={{ opacity: pack.active ? 1 : 0.75 }}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Typography sx={{ fontWeight: 600 }} noWrap>
                    {pack.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Diubah {formatDateTime(pack.updated_at)} · ± {formatNumber(estimateTokens(pack.content))} token
                  </Typography>
                </div>
                <Tooltip title={pack.active ? 'Nonaktifkan' : 'Aktifkan'}>
                  <Switch
                    checked={pack.active}
                    disabled={update.isPending && update.variables?.id === pack.id}
                    onChange={(e) => update.mutate({ id: pack.id, active: e.target.checked })}
                    slotProps={{ input: { 'aria-label': `Aktif ${pack.name}` } }}
                  />
                </Tooltip>
              </div>
              <Typography
                component="pre"
                className="line-clamp-6 font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
                sx={{ color: 'text.secondary' }}
              >
                {pack.content}
              </Typography>
              <div className="mt-auto flex items-center gap-1">
                <Chip size="small" label={pack.active ? 'Aktif' : 'Nonaktif'} color={pack.active ? 'success' : 'default'} variant="outlined" />
                <OwnerChip userId={pack.user_id} />
                <span className="flex-1" />
                <Tooltip title="Ubah">
                  <IconButton
                    onClick={() => {
                      setEditing(pack)
                      setDialogOpen(true)
                    }}
                    aria-label={`Ubah ${pack.name}`}
                  >
                    <Pencil size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Hapus">
                  <IconButton onClick={() => setDeleting(pack)} aria-label={`Hapus ${pack.name}`}>
                    <Trash2 size={18} />
                  </IconButton>
                </Tooltip>
              </div>
            </Paper>
          ))}
        </div>
      )}

      <ContextPackDialog open={dialogOpen} pack={editing} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        title="Hapus context pack?"
        description={
          <>
            <b>{deleting?.name}</b> akan dihapus dan tidak lagi disisipkan ke request. Untuk menyimpan tanpa
            menyisipkan, nonaktifkan saja.
          </>
        }
        confirmLabel="Hapus"
        destructive
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}
