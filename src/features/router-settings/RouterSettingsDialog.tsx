import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { RouterSettingsFields } from './RouterSettingsFields'

export function RouterSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pengaturan 9Router</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        <DialogContentText variant="body2">
          Middleware tidak punya akun 9Router sendiri. Chat, eval, dan pemilih cadangan skill memakai alamat,
          key, dan model 9Router milikmu, jadi biayanya masuk ke akunmu.
        </DialogContentText>
        <RouterSettingsFields />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Selesai
        </Button>
      </DialogActions>
    </Dialog>
  )
}
