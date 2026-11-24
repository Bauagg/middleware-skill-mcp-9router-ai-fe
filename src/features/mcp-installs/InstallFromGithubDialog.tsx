import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import { FileKey, Search } from 'lucide-react'
import { getErrorMessage } from '@/lib/axios'
import { useIsAdmin } from '@/stores/authStore'
import { useAnalyzeRepo, useSubmitInstall, type McpInstall, type RepoAnalysis } from './api'

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,38}$/
const ENV_RE = /^[A-Z][A-Z0-9_]{0,63}$/
const splitList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

interface FormState {
  name: string
  install_command: string
  start_command: string
  transport: 'stdio' | 'http'
  http_path: string
  env_keys: string
  keywords: string
  purpose: string
  /** admins only: '' until chosen */
  shared: '' | 'true' | 'false'
}

/** Best-effort defaults from the analysis. Always shown for review, never submitted blindly. */
function suggest(a: RepoAnalysis): FormState {
  const pm = a.package_manager || 'npm'
  const node = a.runtime === 'node'
  const firstBin = a.bin ? Object.values(a.bin)[0] : undefined
  let install = ''
  let start = ''
  if (node) {
    install = `${pm} install${a.scripts?.build ? ` && ${pm} run build` : ''}`
    start = firstBin ? `node ${firstBin.replace(/^\.\//, '')}` : a.scripts?.start ? `${pm} start` : ''
  } else if (a.runtime === 'python' && a.python_scripts?.length) {
    start = a.python_scripts[0]
  }
  return {
    name: a.repo.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+/, '').slice(0, 39),
    install_command: install,
    start_command: start,
    transport: 'stdio',
    http_path: '/mcp',
    env_keys: (a.env_example ?? []).join(', '),
    keywords: a.repo.toLowerCase(),
    purpose: '',
    shared: '',
  }
}

export function InstallFromGithubDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isAdmin = useIsAdmin()
  const analyze = useAnalyzeRepo()
  const submit = useSubmitInstall()
  const [repoUrl, setRepoUrl] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [result, setResult] = useState<McpInstall | null>(null)
  const [showReadme, setShowReadme] = useState(false)
  const analysis = analyze.data
  const step = result ? 2 : form ? 1 : 0
  const busy = analyze.isPending || submit.isPending

  const close = () => {
    if (busy) return
    onClose()
    setRepoUrl('')
    setForm(null)
    setResult(null)
    setShowReadme(false)
    analyze.reset()
    submit.reset()
  }

  const runAnalyze = () =>
    analyze.mutate(repoUrl, {
      onSuccess: (a) => setForm(suggest(a)),
    })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))

  const envKeys = form ? splitList(form.env_keys) : []
  const badEnv = envKeys.filter((k) => !ENV_RE.test(k))
  const formValid =
    !!form &&
    NAME_RE.test(form.name) &&
    form.start_command.trim() !== '' &&
    badEnv.length === 0 &&
    (form.transport === 'stdio' || form.http_path.startsWith('/')) &&
    (!isAdmin || form.shared !== '')

  const runSubmit = () => {
    if (!form || !analysis) return
    submit.mutate(
      {
        repo_url: analysis.repo_url,
        name: form.name,
        install_command: form.install_command.trim(),
        start_command: form.start_command.trim(),
        transport: form.transport,
        http_path: form.transport === 'http' ? form.http_path.trim() : undefined,
        env_keys: envKeys,
        keywords: splitList(form.keywords),
        purpose: form.purpose.trim(),
        shared: isAdmin ? form.shared === 'true' : undefined,
      },
      { onSuccess: (res) => setResult(res.data) },
    )
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : close} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>Pasang MCP dari GitHub</DialogTitle>
      <DialogContent dividers className="flex flex-col gap-4">
        <Stepper activeStep={step} alternativeLabel>
          <Step>
            <StepLabel>Analisis repo</StepLabel>
          </Step>
          <Step>
            <StepLabel>Atur perintah</StepLabel>
          </Step>
          <Step>
            <StepLabel>{isAdmin ? 'Terpasang' : 'Diajukan'}</StepLabel>
          </Step>
        </Stepper>

        {/* step 1: analyze */}
        {step === 0 && (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Repo diunduh dan dikunci ke commit terbaru, lalu diperiksa (package.json, pyproject, .env.example,
              README). Belum ada kode yang dijalankan di langkah ini.
            </Typography>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault()
                if (repoUrl.trim()) runAnalyze()
              }}
            >
              <TextField
                fullWidth
                autoFocus
                label="URL repo GitHub"
                placeholder="https://github.com/bytebase/dbhub"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={analyze.isPending}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!repoUrl.trim() || analyze.isPending}
                startIcon={analyze.isPending ? <CircularProgress size={16} color="inherit" /> : <Search size={16} />}
                sx={{ flexShrink: 0 }}
              >
                Analisis
              </Button>
            </form>
            {analyze.isPending && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Mengunduh repo, bisa sampai satu menit untuk repo besar…
              </Typography>
            )}
            {analyze.isError && <Alert severity="error">{getErrorMessage(analyze.error)}</Alert>}
          </>
        )}

        {/* step 2: commands */}
        {step === 1 && form && analysis && (
          <>
            <AnalysisSummary analysis={analysis} showReadme={showReadme} onToggleReadme={() => setShowReadme((v) => !v)} />

            <Alert severity="warning">
              Perintah di bawah adalah tebakan dari isi repo. Cocokkan dengan README sebelum mengajukan: perintah inilah
              yang dijalankan di container.
            </Alert>

            <TextField
              label="Nama"
              value={form.name}
              onChange={(e) => set('name', e.target.value.toLowerCase())}
              error={!NAME_RE.test(form.name)}
              helperText="Huruf kecil, angka, - atau _, maks 39. Menjadi nama server MCP."
            />
            <TextField
              label="Perintah install"
              placeholder="mis. pnpm install && pnpm build"
              value={form.install_command}
              onChange={(e) => set('install_command', e.target.value)}
              helperText="Dijalankan sekali per commit. Kosongkan bila tidak perlu."
              slotProps={{ htmlInput: { className: 'font-mono text-sm' } }}
            />
            <TextField
              label="Perintah start"
              required
              placeholder='mis. node dist/index.js --transport stdio --dsn "$DSN"'
              value={form.start_command}
              onChange={(e) => set('start_command', e.target.value)}
              error={form.start_command.trim() === ''}
              helperText="Boleh merujuk data rahasia sebagai variabel, mis. $DSN."
              slotProps={{ htmlInput: { className: 'font-mono text-sm' } }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                select
                label="Transport"
                value={form.transport}
                onChange={(e) => set('transport', e.target.value as FormState['transport'])}
                helperText={form.transport === 'stdio' ? 'Dibungkus supergateway jadi HTTP' : 'Server mendengarkan 0.0.0.0:8000'}
              >
                <MenuItem value="stdio">stdio</MenuItem>
                <MenuItem value="http">http</MenuItem>
              </TextField>
              {form.transport === 'http' && (
                <TextField
                  label="Path HTTP"
                  value={form.http_path}
                  onChange={(e) => set('http_path', e.target.value)}
                  error={!form.http_path.startsWith('/')}
                  helperText="Mis. /mcp"
                />
              )}
            </div>
            <TextField
              label="Nama data rahasia"
              placeholder="DSN, API_TOKEN"
              value={form.env_keys}
              onChange={(e) => set('env_keys', e.target.value.toUpperCase())}
              error={badEnv.length > 0}
              helperText={
                badEnv.length > 0
                  ? `Tidak valid: ${badEnv.join(', ')} (huruf besar, angka, _)`
                  : 'Dipisah koma. Hanya namanya: nilainya diisi lewat form terpisah, tidak pernah lewat sini.'
              }
              slotProps={{ htmlInput: { className: 'font-mono text-sm' } }}
            />
            <TextField
              label="Kata kunci"
              placeholder="database, sql, postgres"
              value={form.keywords}
              onChange={(e) => set('keywords', e.target.value)}
              helperText="Dipisah koma. Tool ditawarkan ke model bila pesan menyebut salah satunya."
            />
            <TextField
              label="Tujuan"
              placeholder="mis. supaya chat bisa menjalankan query ke database penjualan"
              multiline
              minRows={2}
              value={form.purpose}
              onChange={(e) => set('purpose', e.target.value.slice(0, 1000))}
              helperText={isAdmin ? undefined : 'Membantu admin memutuskan untuk menyetujui.'}
            />

            {isAdmin && (
              <FormControl error={form.shared === ''}>
                <FormLabel sx={{ fontSize: 14 }}>Dipakai bersama atau per user? (wajib)</FormLabel>
                <RadioGroup value={form.shared} onChange={(e) => set('shared', e.target.value as FormState['shared'])}>
                  <FormControlLabel
                    value="true"
                    control={<Radio />}
                    label="Sharing: satu container berisi data rahasia milikku, dipakai semua user"
                  />
                  <FormControlLabel
                    value="false"
                    control={<Radio />}
                    label="Tidak sharing: tiap user mengisi data rahasianya sendiri dan mendapat container sendiri"
                  />
                </RadioGroup>
                <FormHelperText>
                  Pemasanganmu langsung disetujui dan berlaku untuk semua user.
                  {form.shared === 'false' && ' Tiap user memakan memori container sendiri; perhatikan kapasitas VPS.'}
                </FormHelperText>
              </FormControl>
            )}

            {submit.isError && <Alert severity="error">{getErrorMessage(submit.error)}</Alert>}
          </>
        )}

        {/* step 3: done */}
        {step === 2 && result && (
          <div className="flex flex-col gap-3">
            <Alert severity="success">
              {result.status === 'pending_review'
                ? `${result.name} diajukan dan menunggu persetujuan admin.`
                : `${result.name} terpasang dan berlaku untuk semua user.`}
            </Alert>
            {(result.env_keys?.length ?? 0) > 0 && (
              <>
                <Typography variant="body2">
                  MCP ini butuh data rahasia ({result.env_keys!.join(', ')}). Isi lewat form terpisah; nilainya disimpan
                  terenkripsi dan tidak pernah ditampilkan lagi.
                  {result.per_user && ' Pada mode tidak sharing, tiap user mengisi miliknya sendiri.'}
                </Typography>
                {result.env_url && (
                  <div>
                    <Button
                      variant="contained"
                      startIcon={<FileKey size={16} />}
                      href={result.env_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Isi data rahasia
                    </Button>
                  </div>
                )}
              </>
            )}
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Status dan log bisa dipantau di daftar pemasangan.
            </Typography>
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {step === 1 && (
          <Button
            color="inherit"
            onClick={() => {
              setForm(null)
              analyze.reset()
              submit.reset()
            }}
            disabled={busy}
            sx={{ mr: 'auto' }}
          >
            Ganti repo
          </Button>
        )}
        <Button onClick={close} color="inherit" disabled={busy}>
          {step === 2 ? 'Tutup' : 'Batal'}
        </Button>
        {step === 1 && (
          <Button
            variant="contained"
            onClick={runSubmit}
            disabled={!formValid || submit.isPending}
            startIcon={submit.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isAdmin ? 'Pasang' : 'Ajukan'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

function AnalysisSummary({
  analysis: a,
  showReadme,
  onToggleReadme,
}: {
  analysis: RepoAnalysis
  showReadme: boolean
  onToggleReadme: () => void
}) {
  const scripts = Object.entries(a.scripts ?? {})
  return (
    <Box className="flex flex-col gap-2 rounded-xl border p-4" sx={{ borderColor: 'divider' }}>
      <div className="flex flex-wrap items-center gap-2">
        <Typography sx={{ fontWeight: 600 }}>
          {a.owner}/{a.repo}
        </Typography>
        <Chip size="small" variant="outlined" className="font-mono" label={a.commit_sha.slice(0, 12)} />
        {a.runtime && <Chip size="small" variant="outlined" label={a.runtime} />}
        {a.package_manager && <Chip size="small" variant="outlined" label={a.package_manager} />}
        {a.node_engine && <Chip size="small" variant="outlined" label={`node ${a.node_engine}`} />}
        {a.has_dockerfile && <Chip size="small" variant="outlined" label="Dockerfile" />}
        <Chip size="small" variant="outlined" label={`${a.files} file`} />
      </div>
      {scripts.length > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} className="font-mono">
          scripts: {scripts.map(([k, v]) => `${k}=${v}`).join(' · ')}
        </Typography>
      )}
      {a.bin && Object.keys(a.bin).length > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} className="font-mono">
          bin: {Object.entries(a.bin).map(([k, v]) => `${k} → ${v}`).join(' · ')}
        </Typography>
      )}
      {(a.python_scripts?.length ?? 0) > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} className="font-mono">
          python scripts: {a.python_scripts!.join(', ')}
        </Typography>
      )}
      {(a.env_example?.length ?? 0) > 0 && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} className="font-mono">
          .env.example: {a.env_example!.join(', ')}
        </Typography>
      )}
      {a.readme && (
        <div>
          <Button size="small" color="inherit" onClick={onToggleReadme} sx={{ ml: -1 }}>
            {showReadme ? 'Sembunyikan' : 'Lihat'} potongan README
          </Button>
          <Collapse in={showReadme}>
            <Box
              component="pre"
              className="mt-1 max-h-64 overflow-auto rounded-lg p-3 text-[13px] whitespace-pre-wrap"
              sx={{ bgcolor: 'action.hover', m: 0 }}
            >
              {a.readme}
            </Box>
          </Collapse>
        </div>
      )}
    </Box>
  )
}
