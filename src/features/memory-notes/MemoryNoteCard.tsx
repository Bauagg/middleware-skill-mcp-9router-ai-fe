import { useState } from 'react'
import { Box, Button, Chip, Collapse, Paper, Typography } from '@mui/material'
import {
  Ban,
  Check,
  CircleCheck,
  CircleDashed,
  CircleX,
  Pencil,
  PenLine,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { OwnerChip } from '@/components/common/OwnerChip'
import { formatDate, formatDateTime } from '@/lib/format'
import type { MemoryNote, MemoryStatus } from './api'

const statusMeta: Record<
  MemoryStatus,
  { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: LucideIcon }
> = {
  proposed: { label: 'Usulan', color: 'warning', icon: CircleDashed },
  active: { label: 'Aktif', color: 'success', icon: CircleCheck },
  corrected: { label: 'Dikoreksi', color: 'info', icon: PenLine },
  rejected: { label: 'Ditolak', color: 'default', icon: CircleX },
  deleted: { label: 'Dihapus', color: 'default', icon: Trash2 },
}

interface Props {
  note: MemoryNote
  busy?: boolean
  onConfirm: () => void
  onReject: () => void
  onEdit: () => void
  onDelete: () => void
}

export function MemoryNoteCard({ note, busy, onConfirm, onReject, onEdit, onDelete }: Props) {
  const [showSource, setShowSource] = useState(false)
  const meta = statusMeta[note.status]
  const StatusIcon = meta.icon
  const canConfirm = note.status === 'proposed' || note.status === 'rejected'
  const canReject = note.status === 'proposed' || note.status === 'active' || note.status === 'corrected'
  const editable = note.status !== 'deleted'

  return (
    <Paper variant="outlined" className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Typography sx={{ fontWeight: 600 }} className="mr-auto">
          {note.topic}
        </Typography>
        <Chip size="small" color={meta.color} icon={<StatusIcon size={14} />} label={meta.label} />
        <Chip size="small" variant="outlined" label={note.origin === 'manual' ? 'Manual' : 'Ekstraksi otomatis'} />
        <Chip size="small" variant="outlined" label={note.result_source === 'data' ? 'Sumber: data' : 'Sumber: user'} />
        <OwnerChip userId={note.user_id} />
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-[110px_1fr]">
        <Field label="Dicoba" value={note.tried} />
        <Field label="Hasil" value={note.result} />
        <Field label="Pelajaran" value={note.lesson} />
      </dl>

      {note.source_excerpt && (
        <div>
          <Button size="small" color="inherit" onClick={() => setShowSource((v) => !v)} sx={{ px: 1, ml: -1 }}>
            {showSource ? 'Sembunyikan' : 'Lihat'} kutipan percakapan
          </Button>
          <Collapse in={showSource}>
            <Box
              className="mt-1 rounded-lg p-3 text-sm whitespace-pre-wrap"
              sx={{ bgcolor: 'action.hover', color: 'text.secondary' }}
            >
              {note.source_excerpt}
            </Box>
          </Collapse>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="caption" sx={{ color: 'text.secondary' }} className="mr-auto">
          Dibuat {formatDateTime(note.created_at)}
          {note.extract_model && ` · ${note.extract_model}`}
          {note.expires_at && ` · kedaluwarsa ${formatDate(note.expires_at)}`}
        </Typography>
        {canConfirm && (
          <Button size="small" variant="contained" startIcon={<Check size={16} />} onClick={onConfirm} disabled={busy}>
            Konfirmasi
          </Button>
        )}
        {editable && (
          <Button size="small" variant="outlined" startIcon={<Pencil size={16} />} onClick={onEdit} disabled={busy}>
            Koreksi
          </Button>
        )}
        {canReject && (
          <Button size="small" variant="outlined" color="inherit" startIcon={<Ban size={16} />} onClick={onReject} disabled={busy}>
            Tolak
          </Button>
        )}
        {editable && (
          <Button size="small" color="error" startIcon={<Trash2 size={16} />} onClick={onDelete} disabled={busy}>
            Hapus
          </Button>
        )}
      </div>
    </Paper>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Typography component="dt" variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography component="dd" variant="body2" className="whitespace-pre-wrap">
        {value}
      </Typography>
    </>
  )
}
