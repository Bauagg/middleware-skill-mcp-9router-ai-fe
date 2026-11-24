import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  MenuItem,
  TextField,
} from '@mui/material'
import { Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSkills } from '@/features/skills/api'
import { hasRouterAccess, useRouterSettings } from '@/stores/routerStore'
import { EVAL_VARIANTS, useStartEval, type EvalVariant } from './api'

const variantHelp: Record<EvalVariant, string> = {
  full: 'SKILL.md utuh',
  short: 'SHORT.md',
  none: 'tanpa skill',
}

interface Props {
  open: boolean
  initialSkill?: string
  onClose: () => void
}

export function StartEvalDialog({ open, initialSkill, onClose }: Props) {
  const skills = useSkills()
  const start = useStartEval()
  const navigate = useNavigate()
  const [skill, setSkill] = useState('')
  const [variants, setVariants] = useState<EvalVariant[]>(EVAL_VARIANTS)
  const router = useRouterSettings()
  const [model, setModel] = useState('')
  const [judgeModel, setJudgeModel] = useState('')
  const [limit, setLimit] = useState('')

  useEffect(() => {
    if (open) {
      setSkill(initialSkill ?? '')
      setVariants(EVAL_VARIANTS)
      setModel(router.model)
      setJudgeModel('')
      setLimit('')
      start.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, initialSkill])

  const limitNum = limit === '' ? undefined : Number(limit)
  const limitValid = limitNum === undefined || (Number.isInteger(limitNum) && limitNum >= 1 && limitNum <= 30)
  const routerReady = hasRouterAccess(router)
  const valid = !!skill && variants.length > 0 && limitValid && !!model.trim() && routerReady

  const toggle = (v: EvalVariant) =>
    setVariants((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : EVAL_VARIANTS.filter((x) => x === v || cur.includes(x))))

  const submit = () =>
    start.mutate(
      {
        input: { skill, variants, model: model.trim(), judge_model: judgeModel.trim() || undefined, limit: limitNum },
        router,
      },
      {
        onSuccess: (res) => {
          onClose()
          navigate(`/evals/${res.data.run_id}`)
        },
      },
    )

  return (
    <Dialog open={open} onClose={start.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mulai eval</DialogTitle>
      <DialogContent className="flex flex-col gap-4" sx={{ pt: '8px !important' }}>
        <TextField
          select
          label="Skill"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          helperText="Soal diambil dari skills/<nama>/EVAL.yaml"
          disabled={skills.isPending}
        >
          {(skills.data ?? [])
            .filter((s) => !s.error)
            .map((s) => (
              <MenuItem key={s.name} value={s.name} className="font-mono">
                {s.name}
              </MenuItem>
            ))}
        </TextField>

        <div>
          <FormLabel component="legend" sx={{ fontSize: 14 }}>
            Varian yang dibandingkan
          </FormLabel>
          <FormGroup row>
            {EVAL_VARIANTS.map((v) => (
              <FormControlLabel
                key={v}
                control={<Checkbox checked={variants.includes(v)} onChange={() => toggle(v)} />}
                label={`${v} (${variantHelp[v]})`}
              />
            ))}
          </FormGroup>
          {variants.length === 0 && <FormHelperText error>Pilih minimal satu varian</FormHelperText>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Model target"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            helperText="Model 9Router yang diuji"
          />
          <TextField
            label="Model hakim"
            placeholder="sama dengan target"
            value={judgeModel}
            onChange={(e) => setJudgeModel(e.target.value)}
            helperText="Opsional"
          />
          <TextField
            label="Jumlah soal"
            placeholder="semua"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            error={!limitValid}
            helperText={limitValid ? 'Kosongkan untuk semua soal' : 'Angka 1–30'}
          />
        </div>

        {!routerReady && (
          <Alert severity="warning">
            Eval berjalan di 9Router milikmu. Isi alamat dan key 9Router dulu lewat tombol kunci di bar atas.
          </Alert>
        )}
        <Alert severity="info">
          Biaya masuk ke akun 9Router kamu: jumlah soal × {variants.length || 0} varian × 2 panggilan model (jawab +
          nilai). Jalankan saat skill berubah saja.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={start.isPending}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!valid || start.isPending}
          startIcon={start.isPending ? <CircularProgress size={16} color="inherit" /> : <Play size={16} />}
        >
          Mulai
        </Button>
      </DialogActions>
    </Dialog>
  )
}
