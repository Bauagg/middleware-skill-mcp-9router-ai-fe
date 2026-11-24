import type { ReactNode } from 'react'
import { Typography } from '@mui/material'

interface PageHeaderProps {
  description?: ReactNode
  actions?: ReactNode
}

/** Description + action buttons row at the top of a page (the title lives in the app bar). */
export function PageHeader({ description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {description ? (
        <Typography sx={{ color: 'text.secondary', maxWidth: 640 }}>{description}</Typography>
      ) : (
        <span />
      )}
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
