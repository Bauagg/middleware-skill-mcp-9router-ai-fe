import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { ArrowLeft, CircleCheck, Loader } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/common/States'
import { useEvalRun, type EvalRow } from '@/features/evals/api'
import { formatMs, formatNumber, formatScore } from '@/lib/format'

export function EvalRunPage() {
  const { runId = '' } = useParams()
  const [showAnswers, setShowAnswers] = useState(false)
  const run = useEvalRun(runId, showAnswers)

  const cases = useMemo(() => {
    const byCase = new Map<number, EvalRow[]>()
    for (const row of run.data?.rows ?? []) {
      byCase.set(row.case_index, [...(byCase.get(row.case_index) ?? []), row])
    }
    return [...byCase.entries()].sort((a, b) => a[0] - b[0])
  }, [run.data?.rows])

  if (run.isPending) return <LoadingState />
  if (run.isError) return <ErrorState error={run.error} onRetry={() => run.refetch()} />

  const data = run.data
  const running = data.status === 'running'
  const progress = data.total ? (data.completed / data.total) * 100 : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button component={Link} to="/evals" color="inherit" startIcon={<ArrowLeft size={16} />} sx={{ ml: -1 }}>
          Semua eval
        </Button>
      </div>

      <Paper variant="outlined" className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Typography sx={{ fontWeight: 700, fontSize: 20 }} className="mr-auto font-mono">
            {data.skill}
          </Typography>
          <Chip
            color={running ? 'info' : 'success'}
            icon={running ? <Loader size={14} className="animate-spin" /> : <CircleCheck size={14} />}
            label={running ? 'Berjalan' : 'Selesai'}
          />
        </div>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Versi <span className="font-mono">{data.skill_version}</span> · model <span className="font-mono">{data.model}</span> ·
          hakim <span className="font-mono">{data.judge_model}</span>
        </Typography>
        {running && (
          <div className="flex items-center gap-3">
            <LinearProgress variant="determinate" value={progress} className="flex-1" />
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {data.completed} / {data.total}
            </Typography>
          </div>
        )}
      </Paper>

      {data.notes.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.notes.map((note) => (
            <Alert key={note} severity="info">
              {note}
            </Alert>
          ))}
        </div>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Varian</TableCell>
              <TableCell sx={{ width: '35%' }}>Skor rata-rata (0–10)</TableCell>
              <TableCell align="right">Dinilai</TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                Token skill
              </TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                Token prompt
              </TableCell>
              <TableCell align="right">Error</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.variants.map((v) => (
              <TableRow key={v.variant}>
                <TableCell className="font-mono" sx={{ fontWeight: 600 }}>
                  {v.variant}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Box className="relative h-2 flex-1 rounded-full" sx={{ bgcolor: 'action.hover' }}>
                      <Box
                        className="absolute inset-y-0 left-0 rounded-full"
                        sx={{ width: `${((v.avg_score ?? 0) / 10) * 100}%`, bgcolor: 'primary.main' }}
                      />
                    </Box>
                    <Typography sx={{ fontWeight: 600, minWidth: 40, fontVariantNumeric: 'tabular-nums' }}>
                      {formatScore(v.avg_score)}
                    </Typography>
                  </div>
                </TableCell>
                <TableCell align="right">
                  {v.scored} / {v.cases}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {formatNumber(v.avg_skill_tokens)}
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {formatNumber(v.avg_prompt_tokens)}
                </TableCell>
                <TableCell align="right" sx={{ color: v.errors ? 'error.main' : undefined }}>
                  {v.errors}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <FormControlLabel
        control={<Switch checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />}
        label="Tampilkan tiap jawaban, skor, dan alasan hakim"
      />

      {showAnswers && run.isFetching && !data.rows && <LinearProgress />}
      {showAnswers &&
        cases.map(([index, rows]) => (
          <Paper key={index} variant="outlined" className="flex flex-col gap-3 p-4">
            <div>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Soal {index + 1}
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{rows[0].question}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Kriteria: {rows[0].criteria}
              </Typography>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {rows.map((row) => (
                <Box key={row.id} className="flex flex-col gap-2 rounded-lg border p-3" sx={{ borderColor: 'divider' }}>
                  <div className="flex items-center gap-2">
                    <Typography className="mr-auto font-mono" sx={{ fontWeight: 600, fontSize: 14 }}>
                      {row.variant}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatScore(row.score)}
                    </Typography>
                  </div>
                  {row.error ? (
                    <Alert severity="error">{row.error}</Alert>
                  ) : (
                    <Typography variant="body2" className="max-h-64 overflow-auto whitespace-pre-wrap">
                      {row.answer}
                    </Typography>
                  )}
                  {row.reason && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} className="whitespace-pre-wrap">
                      Hakim: {row.reason}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatMs(row.latency_ms)} · prompt {formatNumber(row.prompt_tokens)} · jawaban {formatNumber(row.completion_tokens)}
                  </Typography>
                </Box>
              ))}
            </div>
          </Paper>
        ))}
    </div>
  )
}
