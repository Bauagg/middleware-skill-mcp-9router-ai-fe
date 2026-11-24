import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { CircleCheck, CircleSlash, Search } from 'lucide-react'
import { ErrorState } from '@/components/common/States'
import { formatScore } from '@/lib/format'
import { isRouterReady, useRouterSettings } from '@/stores/routerStore'
import { useSkillMatch, type SkillMatchParams } from './api'

const methodLabel: Record<string, string> = {
  bm25: 'BM25 (kecocokan kata)',
  embedding: 'Embedding (kemiripan makna)',
  fallback: 'Pemilih cadangan (model)',
}

export function SkillMatchTester() {
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(5)
  const [fallback, setFallback] = useState(false)
  const [params, setParams] = useState<SkillMatchParams | null>(null)
  const router = useRouterSettings()
  const routerReady = isRouterReady(router)
  const match = useSkillMatch(params, router)
  const data = match.data
  const maxScore = Math.max(data?.threshold ?? 0, ...(data?.candidates.map((c) => c.score) ?? [0]), 0.0001)

  return (
    <div className="flex flex-col gap-4">
      <Paper variant="outlined" className="p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) setParams({ q: q.trim(), limit, fallback: fallback && routerReady })
          }}
        >
          <TextField
            label="Pesan user"
            placeholder="mis. berapa harga yang pas untuk produk saya"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            multiline
            minRows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.closest('form')?.requestSubmit()
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <TextField select size="small" label="Kandidat" value={limit} onChange={(e) => setLimit(Number(e.target.value))} sx={{ width: 120 }}>
              {[3, 5, 10, 20].map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
            <Tooltip
              title={
                routerReady
                  ? `Bila skor ambigu, model ${router.model} di 9Router kamu yang memilih`
                  : 'Butuh alamat, key, dan model 9Router (tombol kunci di bar atas)'
              }
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={fallback && routerReady}
                    disabled={!routerReady}
                    onChange={(e) => setFallback(e.target.checked)}
                  />
                }
                label="Jalankan pemilih cadangan bila ambigu"
              />
            </Tooltip>
            <span className="flex-1" />
            <Button type="submit" variant="contained" startIcon={<Search size={16} />} disabled={!q.trim()}>
              Uji
            </Button>
          </div>
        </form>
      </Paper>

      {match.isFetching && <LinearProgress />}
      {match.isError && <ErrorState error={match.error} onRetry={() => match.refetch()} />}

      {data && (
        <>
          <Paper variant="outlined" className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              {data.selected ? <CircleCheck size={22} /> : <CircleSlash size={22} />}
              <div className="min-w-0 flex-1">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Skill terpilih
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 18 }} className="font-mono">
                  {data.selected ?? 'Tidak ada skill'}
                </Typography>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip size="small" variant="outlined" label={methodLabel[data.method] ?? data.method} />
              <Chip size="small" variant="outlined" label={`Ambang skor: ${formatScore(data.threshold)}`} />
              {data.ambiguous && <Chip size="small" color="warning" label="Ambigu" />}
              <Chip
                size="small"
                variant="outlined"
                label={data.fallback_enabled ? 'Pemilih cadangan aktif' : 'Pemilih cadangan mati'}
              />
              {data.fallback_tokens > 0 && (
                <Chip size="small" variant="outlined" label={`${data.fallback_tokens} token pemilih cadangan`} />
              )}
            </div>
            {!data.selected && data.candidates.length === 0 && (
              <Alert severity="info">
                Tidak ada skill yang cocok. Tambahkan <code>keywords</code> di frontmatter skill dalam bahasa yang
                dipakai user.
              </Alert>
            )}
          </Paper>

          {data.candidates.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kandidat</TableCell>
                    <TableCell sx={{ width: '40%' }}>Skor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.candidates.map((c) => {
                    const passes = c.score >= data.threshold
                    return (
                      <TableRow key={c.name} selected={c.name === data.selected}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }} className="font-mono">
                            {c.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }} className="line-clamp-2">
                            {c.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ScoreBar value={c.score} max={maxScore} threshold={data.threshold} />
                            <Typography sx={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', minWidth: 44, fontWeight: passes ? 600 : 400 }}>
                              {formatScore(c.score)}
                            </Typography>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </div>
  )
}

/** Single-hue magnitude bar with a tick at the selection threshold. */
function ScoreBar({ value, max, threshold }: { value: number; max: number; threshold: number }) {
  return (
    <Box className="relative h-2 flex-1 rounded-full" sx={{ bgcolor: 'action.hover' }}>
      <Box
        className="absolute inset-y-0 left-0 rounded-full"
        sx={{ width: `${Math.min(100, (value / max) * 100)}%`, bgcolor: 'primary.main' }}
      />
      <Box
        title={`Ambang ${formatScore(threshold)}`}
        className="absolute -inset-y-1 w-0.5"
        sx={{ left: `${Math.min(100, (threshold / max) * 100)}%`, bgcolor: 'text.primary' }}
      />
    </Box>
  )
}
