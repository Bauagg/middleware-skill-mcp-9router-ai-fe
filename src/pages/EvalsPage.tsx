import { useState } from 'react'
import {
  Button,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { FlaskConical, Play } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { OwnerChip } from '@/components/common/OwnerChip'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import { useEvalRuns } from '@/features/evals/api'
import { StartEvalDialog } from '@/features/evals/StartEvalDialog'
import { useSkills } from '@/features/skills/api'
import { formatDateTime, formatScore } from '@/lib/format'

export function EvalsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const skillFilter = params.get('skill') ?? ''
  // "?new=1" (from the Skills page) opens the dialog with that skill preselected
  const [dialogOpen, setDialogOpen] = useState(params.get('new') === '1')
  const runs = useEvalRuns(skillFilter)
  const skills = useSkills()

  const setSkillFilter = (skill: string) => {
    const next = new URLSearchParams(params)
    if (skill) next.set('skill', skill)
    else next.delete('skill')
    next.delete('new')
    setParams(next, { replace: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Bandingkan jawaban dengan skill utuh, SHORT.md, dan tanpa skill. Model hakim menilai 0–10 tanpa tahu varian mana yang menjawab."
        actions={
          <Button variant="contained" startIcon={<Play size={16} />} onClick={() => setDialogOpen(true)}>
            Mulai eval
          </Button>
        }
      />

      <TextField
        select
        size="small"
        label="Filter skill"
        value={skillFilter}
        onChange={(e) => setSkillFilter(e.target.value)}
        sx={{ maxWidth: 280 }}
      >
        <MenuItem value="">Semua skill</MenuItem>
        {(skills.data ?? []).map((s) => (
          <MenuItem key={s.name} value={s.name} className="font-mono">
            {s.name}
          </MenuItem>
        ))}
      </TextField>

      {runs.isPending ? (
        <LoadingState />
      ) : runs.isError ? (
        <ErrorState error={runs.error} onRetry={() => runs.refetch()} />
      ) : runs.data.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Belum ada eval"
          description="Tulis soal di skills/<nama>/EVAL.yaml lalu mulai eval."
          action={
            <Button variant="contained" startIcon={<Play size={16} />} onClick={() => setDialogOpen(true)}>
              Mulai eval
            </Button>
          }
        />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mulai</TableCell>
                <TableCell>Skill</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Model / hakim</TableCell>
                <TableCell align="right">Jawaban</TableCell>
                <TableCell align="right">Skor rata-rata</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.data.map((r) => (
                <TableRow key={r.run_id} hover className="cursor-pointer" onClick={() => navigate(`/evals/${r.run_id}`)}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.started_at)}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }} className="font-mono">
                      {r.skill}
                    </Typography>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} className="font-mono">
                        versi {r.skill_version}
                      </Typography>
                      <OwnerChip userId={r.user_id} />
                    </div>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }} className="font-mono">
                    {r.model} / {r.judge_model}
                  </TableCell>
                  <TableCell align="right">{r.row_count}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatScore(r.avg_score)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <StartEvalDialog
        open={dialogOpen}
        initialSkill={skillFilter || undefined}
        onClose={() => {
          setDialogOpen(false)
          if (params.has('new')) setSkillFilter(skillFilter)
        }}
      />
    </div>
  )
}
