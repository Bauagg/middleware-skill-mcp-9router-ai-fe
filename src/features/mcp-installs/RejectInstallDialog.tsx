import { useState } from 'react'
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material'
import { useRejectMcpInstall, type McpInstall } from './api'

const MAX = 1000

export function RejectInstallDialog({ install, onClose }: { install: McpInstall | null; onClose: () => void }) {
  const reject = useRejectMcpInstall()
  const [reason, setReason] = useState('')

  // clear the reason on close so the next dialog starts empty
  const close = () => {
    setReason('')
    onClose()
  }

  const submit = () => {
    if (!install) return
    reject.mutate({ id: install.id, reason }, { onSuccess: close })
  }

  return (
    <Dialog open={!!install} onClose={reject.isPending ? undefined : close} maxWidth="sm" fullWidth>
      <DialogTitle>Tolak pemasangan {install?.name}?</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        <DialogContentText variant="body2">
          Pengajuan ini tidak akan dijalankan. Alasannya ditampilkan ke user yang mengajukan. Kamu masih bisa
          menyetujuinya nanti dari tab Ditolak.
        </DialogContentText>
        <TextField
          label="Alasan (opsional)"
          placeholder="mis. repo meminta akses penuh ke database produksi"
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, MAX))}
          helperText={`${reason.length} / ${MAX} karakter. Kosong = "ditolak admin".`}
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} color="inherit" disabled={reject.isPending}>
          Batal
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={submit}
          disabled={reject.isPending}
          startIcon={reject.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Tolak
        </Button>
      </DialogActions>
    </Dialog>
  )
}
