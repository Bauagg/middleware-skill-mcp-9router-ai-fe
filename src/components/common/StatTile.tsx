import type { ReactNode } from 'react'
import { Paper, Skeleton, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'

interface StatTileProps {
  label: string
  value: ReactNode
  caption?: ReactNode
  icon?: LucideIcon
  loading?: boolean
}

/** Single headline number. Text stays in text ink; the icon only labels the metric. */
export function StatTile({ label, value, caption, icon: Icon, loading }: StatTileProps) {
  return (
    <Paper variant="outlined" className="flex flex-col gap-1 p-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="flex" style={{ opacity: 0.7 }}>
            <Icon size={16} />
          </span>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {label}
        </Typography>
      </div>
      {loading ? (
        <Skeleton width="60%" height={36} />
      ) : (
        <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
      )}
      {caption && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {caption}
        </Typography>
      )}
    </Paper>
  )
}
