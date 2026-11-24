import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material'
import { ErrorState } from '@/components/common/States'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatNumber } from '@/lib/format'
import { useSkillPreview, type SkillVariant } from './api'

const variantLabel: Record<SkillVariant, string> = {
  full: 'SKILL.md utuh',
  short: 'Pakai SHORT.md',
  truncated: 'Dipotong',
}

interface Props {
  name: string | null
  onClose: () => void
}

export function SkillPreviewDialog({ name, onClose }: Props) {
  const [model, setModel] = useState('')
  const [budget, setBudget] = useState('')
  const debouncedModel = useDebouncedValue(model.trim())
  const debouncedBudget = useDebouncedValue(budget.trim())
  const budgetNum = debouncedBudget === '' ? undefined : Number(debouncedBudget)
  const budgetValid = budgetNum === undefined || (Number.isInteger(budgetNum) && budgetNum >= 0)

  const preview = useSkillPreview(budgetValid ? name : null, { model: debouncedModel, budget: budgetNum })
  const data = preview.data

  return (
    <Dialog open={!!name} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        Preview skill <span className="font-mono">{name}</span>
      </DialogTitle>
      <DialogContent dividers className="flex flex-col gap-4">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Teks persis seperti yang akan disisipkan ke system prompt. Isi model untuk memakai budget token model
          itu, atau isi budget secara manual (0 = tanpa batas).
        </Typography>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Model" placeholder="mis. gpt-4o-mini" size="small" value={model} onChange={(e) => setModel(e.target.value)} />
          <TextField
            label="Budget token"
            placeholder="ikut model"
            size="small"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            error={!budgetValid}
            helperText={!budgetValid ? 'Harus angka bulat ≥ 0' : undefined}
          />
        </div>

        {preview.isFetching && <LinearProgress />}
        {preview.isError && <ErrorState error={preview.error} onRetry={() => preview.refetch()} />}

        {data && (
          <>
            <div className="flex flex-wrap gap-2">
              <Chip size="small" label={variantLabel[data.variant] ?? data.variant} color={data.variant === 'full' ? 'default' : 'warning'} />
              <Chip size="small" variant="outlined" label={`± ${formatNumber(data.tokens)} token`} />
              <Chip size="small" variant="outlined" label={`Budget: ${data.budget === 0 ? 'tanpa batas' : formatNumber(data.budget)}`} />
              {data.removed_lines > 0 && <Chip size="small" variant="outlined" label={`${data.removed_lines} baris khusus Claude dibuang`} />}
              {data.removed_blocks > 0 && <Chip size="small" variant="outlined" label={`${data.removed_blocks} blok script dibuang`} />}
            </div>
            {data.variant === 'truncated' && (
              <Alert severity="warning">Isi skill melebihi budget dan dipotong. Pertimbangkan menambah SHORT.md.</Alert>
            )}
            <Typography
              component="pre"
              className="max-h-[50vh] overflow-auto rounded-lg p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
              sx={{ bgcolor: 'action.hover' }}
            >
              {data.text}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Tutup</Button>
      </DialogActions>
    </Dialog>
  )
}
