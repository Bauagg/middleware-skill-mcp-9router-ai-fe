import { Alert, Snackbar } from '@mui/material'
import { useNotifyStore } from '@/lib/notify'

export function Notifier() {
  const { notice, clear } = useNotifyStore()

  return (
    <Snackbar
      key={notice?.id}
      open={!!notice}
      autoHideDuration={notice?.severity === 'error' ? 6000 : 3500}
      onClose={(_, reason) => reason !== 'clickaway' && clear()}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {notice ? (
        <Alert severity={notice.severity} variant="filled" onClose={clear} sx={{ maxWidth: 560 }}>
          {notice.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  )
}
