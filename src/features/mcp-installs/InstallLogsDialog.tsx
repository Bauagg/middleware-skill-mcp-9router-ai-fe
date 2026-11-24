import { useEffect, useRef } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material'
import { RefreshCw } from 'lucide-react'
import { ErrorState } from '@/components/common/States'
import { useInstallLogs, type McpInstall } from './api'

export function InstallLogsDialog({ install, onClose }: { install: McpInstall | null; onClose: () => void }) {
  const logs = useInstallLogs(install?.id ?? null)
  const boxRef = useRef<HTMLPreElement>(null)

  // newest lines are at the bottom
  useEffect(() => {
    const el = boxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs.data])

  return (
    <Dialog open={!!install} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle>
        Log container <span className="font-mono">{install?.name}</span>
      </DialogTitle>
      <DialogContent dividers className="flex flex-col gap-3">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          200 baris terakhir. Pada MCP tanpa sharing, yang tampil adalah container milikmu.
        </Typography>
        {logs.isFetching && <LinearProgress />}
        {logs.isError && <ErrorState error={logs.error} onRetry={() => logs.refetch()} />}
        {logs.data !== undefined && (
          <Box
            component="pre"
            ref={boxRef}
            className="max-h-[60vh] overflow-auto rounded-lg p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all"
            sx={{ bgcolor: '#0b0f1c', color: '#e2e8f0', m: 0 }}
          >
            {logs.data.trim() || '(log kosong)'}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<RefreshCw size={16} />} onClick={() => logs.refetch()} disabled={logs.isFetching}>
          Muat ulang
        </Button>
        <Button onClick={onClose} variant="contained">
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  )
}
