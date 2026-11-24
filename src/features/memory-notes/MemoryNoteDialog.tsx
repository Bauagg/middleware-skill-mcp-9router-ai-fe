import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import {
  memoryNoteSchema,
  useCorrectMemoryNote,
  useCreateMemoryNote,
  type MemoryNote,
  type MemoryNoteInput,
} from './api'

interface Props {
  open: boolean
  /** null = new manual note; otherwise the note being corrected */
  note: MemoryNote | null
  onClose: () => void
}

const empty: MemoryNoteInput = { topic: '', tried: '', result: '', result_source: 'user', lesson: '' }

export function MemoryNoteDialog({ open, note, onClose }: Props) {
  const create = useCreateMemoryNote()
  const correct = useCorrectMemoryNote()
  const saving = create.isPending || correct.isPending

  const { register, control, handleSubmit, reset, formState } = useForm<MemoryNoteInput>({
    resolver: zodResolver(memoryNoteSchema),
    defaultValues: empty,
  })
  const errors = formState.errors

  useEffect(() => {
    if (!open) return
    reset(
      note
        ? {
            topic: note.topic,
            tried: note.tried,
            result: note.result,
            result_source: note.result_source,
            lesson: note.lesson,
          }
        : empty,
    )
  }, [open, note, reset])

  const onSubmit = (values: MemoryNoteInput) => {
    const done = { onSuccess: onClose }
    if (note) correct.mutate({ id: note.id, ...values }, done)
    else create.mutate(values, done)
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>{note ? 'Koreksi catatan' : 'Catatan baru'}</DialogTitle>
        <DialogContent className="flex flex-col gap-4">
          <DialogContentText variant="body2">
            {note
              ? 'Setelah dikoreksi, status catatan menjadi "corrected" dan langsung dipakai.'
              : 'Catatan manual langsung aktif dan bisa disisipkan bila cocok dengan pesan user.'}
          </DialogContentText>
          <TextField
            label="Topik"
            placeholder="promo diskon kopi susu"
            autoFocus
            {...register('topic')}
            error={!!errors.topic}
            helperText={errors.topic?.message}
          />
          <TextField
            label="Yang dicoba"
            placeholder="promo diskon 50% kopi susu literan selama seminggu"
            multiline
            minRows={2}
            {...register('tried')}
            error={!!errors.tried}
            helperText={errors.tried?.message}
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <TextField
              label="Hasil"
              placeholder="penjualan naik 2x tapi rugi Rp1,2 juta"
              multiline
              minRows={2}
              {...register('result')}
              error={!!errors.result}
              helperText={errors.result?.message}
            />
            <Controller
              control={control}
              name="result_source"
              render={({ field }) => (
                <TextField select label="Sumber hasil" {...field} helperText="data = ada angka terukur">
                  <MenuItem value="user">user</MenuItem>
                  <MenuItem value="data">data</MenuItem>
                </TextField>
              )}
            />
          </div>
          <TextField
            label="Pelajaran"
            placeholder="diskon besar menggerus margin; coba bundling atau diskon kecil"
            multiline
            minRows={2}
            {...register('lesson')}
            error={!!errors.lesson}
            helperText={errors.lesson?.message}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Simpan
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
