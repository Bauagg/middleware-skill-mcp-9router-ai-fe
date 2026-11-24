import { useState } from 'react'
import {
  Badge,
  Button,
  InputAdornment,
  LinearProgress,
  Pagination,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { Brain, Plus, Search } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import {
  useConfirmMemoryNote,
  useDeleteMemoryNote,
  useMemoryNotes,
  useRejectMemoryNote,
  type MemoryNote,
  type MemoryStatus,
} from '@/features/memory-notes/api'
import { MemoryMatchTester } from '@/features/memory-notes/MemoryMatchTester'
import { MemoryNoteCard } from '@/features/memory-notes/MemoryNoteCard'
import { MemoryNoteDialog } from '@/features/memory-notes/MemoryNoteDialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

type TabValue = 'all' | MemoryStatus | 'match'

const tabs: { value: TabValue; label: string }[] = [
  { value: 'proposed', label: 'Usulan' },
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'corrected', label: 'Dikoreksi' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'deleted', label: 'Dihapus' },
  { value: 'match', label: 'Uji pencocokan' },
]

const PAGE_SIZE = 10

export function MemoryNotesPage() {
  const [tab, setTab] = useState<TabValue>('proposed')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebouncedValue(search.trim())
  const [dialog, setDialog] = useState<{ open: boolean; note: MemoryNote | null }>({ open: false, note: null })
  const [deleting, setDeleting] = useState<MemoryNote | null>(null)

  const status = tab === 'all' || tab === 'match' ? undefined : tab
  const notes = useMemoryNotes({ status, q, page, limit: PAGE_SIZE })
  // review queue size for the badge
  const proposedCount = useMemoryNotes({ status: 'proposed', page: 1, limit: 1 }).data?.meta.total ?? 0

  const confirm = useConfirmMemoryNote()
  const reject = useRejectMemoryNote()
  const remove = useDeleteMemoryNote()
  const busyId = [confirm, reject, remove].find((m) => m.isPending)?.variables

  const changeTab = (value: TabValue) => {
    setTab(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Pengalaman yang pernah dicoba user (dicoba, hasil, pelajaran). Catatan yang cocok dengan pesan disisipkan sebagai pengingat; usulan otomatis perlu dikonfirmasi dulu."
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setDialog({ open: true, note: null })}>
            Catatan baru
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, v) => changeTab(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              t.value === 'proposed' && proposedCount > 0 ? (
                <Badge badgeContent={proposedCount} color="warning" sx={{ '& .MuiBadge-badge': { right: -12 } }}>
                  {t.label}
                </Badge>
              ) : (
                t.label
              )
            }
            sx={t.value === 'proposed' && proposedCount > 0 ? { pr: 3.5 } : undefined}
          />
        ))}
      </Tabs>

      {tab === 'match' ? (
        <MemoryMatchTester />
      ) : (
        <>
          <TextField
            size="small"
            placeholder="Cari topik, yang dicoba, hasil, atau pelajaran"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            sx={{ maxWidth: 420 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {notes.isFetching && !notes.isPending && <LinearProgress />}

          {notes.isPending ? (
            <LoadingState />
          ) : notes.isError ? (
            <ErrorState error={notes.error} onRetry={() => notes.refetch()} />
          ) : notes.data.notes.length === 0 ? (
            <EmptyState
              icon={Brain}
              title={q ? 'Tidak ada catatan yang cocok' : tab === 'proposed' ? 'Tidak ada usulan yang menunggu' : 'Belum ada catatan'}
              description={
                tab === 'proposed'
                  ? 'Usulan muncul otomatis saat user melaporkan hasil sesuatu di chat (berhasil, gagal, omzet, rugi, ...).'
                  : undefined
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {notes.data.notes.map((note) => (
                  <MemoryNoteCard
                    key={note.id}
                    note={note}
                    busy={busyId === note.id}
                    onConfirm={() => confirm.mutate(note.id)}
                    onReject={() => reject.mutate(note.id)}
                    onEdit={() => setDialog({ open: true, note })}
                    onDelete={() => setDeleting(note)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {notes.data.meta.total} catatan
                </Typography>
                {notes.data.meta.total_pages > 1 && (
                  <Pagination
                    count={notes.data.meta.total_pages}
                    page={page}
                    onChange={(_, p) => setPage(p)}
                    shape="rounded"
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      <MemoryNoteDialog open={dialog.open} note={dialog.note} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <ConfirmDialog
        open={!!deleting}
        title="Hapus catatan?"
        description={
          <>
            Catatan <b>{deleting?.topic}</b> tidak akan disisipkan lagi. Barisnya tetap disimpan supaya isi yang
            sama tidak diusulkan ulang.
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
