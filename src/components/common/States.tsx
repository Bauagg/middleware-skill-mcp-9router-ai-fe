import type { ReactNode } from 'react'
import { Alert, Button, CircularProgress, Paper, Typography } from '@mui/material'
import { Inbox, type LucideIcon } from 'lucide-react'
import { getErrorMessage } from '@/lib/axios'

export function LoadingState({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16">
      <CircularProgress size={22} />
      <Typography sx={{ color: 'text.secondary' }}>{label}</Typography>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Coba lagi
          </Button>
        )
      }
    >
      {getErrorMessage(error)}
    </Alert>
  )
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <Paper variant="outlined" className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Icon size={32} strokeWidth={1.5} />
      <Typography sx={{ fontWeight: 600, mt: 1 }}>{title}</Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
          {description}
        </Typography>
      )}
      {action && <div className="mt-3">{action}</div>}
    </Paper>
  )
}
