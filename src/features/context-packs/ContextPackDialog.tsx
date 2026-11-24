import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { estimateTokens, formatNumber } from '@/lib/format'
import {
  contextPackSchema,
  useCreateContextPack,
  useUpdateContextPack,
  type ContextPack,
  type ContextPackInput,
} from './api'

interface Props {
  open: boolean
  /** null = create a new pack */
  pack: ContextPack | null
  onClose: () => void
}

const empty: ContextPackInput = { name: '', content: '', active: true }

export function ContextPackDialog({ open, pack, onClose }: Props) {
  const create = useCreateContextPack()
  const update = useUpdateContextPack()
  const saving = create.isPending || update.isPending

  const { register, control, handleSubmit, reset, formState } = useForm<ContextPackInput>({
    resolver: zodResolver(contextPackSchema),
    defaultValues: empty,
  })

  useEffect(() => {
    if (open) reset(pack ? { name: pack.name, content: pack.content, active: pack.active } : empty)
  }, [open, pack, reset])

  const content = useWatch({ control, name: 'content' })

  const onSubmit = (values: ContextPackInput) => {
    const done = { onSuccess: onClose }
    if (pack) update.mutate({ id: pack.id, ...values }, done)
    else create.mutate(values, done)
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>{pack ? 'Ubah context pack' : 'Context pack baru'}</DialogTitle>
        <DialogContent className="flex flex-col gap-4" sx={{ pt: '8px !important' }}>
          <TextField
            label="Nama"
            placeholder="mis. bisnis"
            autoFocus
            {...register('name')}
            error={!!formState.errors.name}
            helperText={formState.errors.name?.message ?? 'Unik, maks 100 karakter. Pack aktif digabung berurutan menurut nama.'}
          />
          <TextField
            label="Isi"
            placeholder="Kedai kopi di Bandung, jual kopi susu literan via Instagram dan GoFood. Target: mahasiswa."
            multiline
            minRows={8}
            maxRows={18}
            {...register('content')}
            error={!!formState.errors.content}
            helperText={
              formState.errors.content?.message ??
              `${formatNumber(content.length)} / 20.000 karakter · ± ${formatNumber(estimateTokens(content))} token di setiap request`
            }
            slotProps={{ htmlInput: { className: 'font-mono text-sm' } }}
          />
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                label="Aktif (disisipkan ke setiap request)"
              />
            )}
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
