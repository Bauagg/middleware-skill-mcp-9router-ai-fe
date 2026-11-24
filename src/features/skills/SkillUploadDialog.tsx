import { useRef, useState, type DragEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'
import { FileArchive, Upload } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import { useUploadSkill, type SkillUploadResult } from './api'

interface Props {
  open: boolean
  onClose: () => void
}

export function SkillUploadDialog({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [overwrite, setOverwrite] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<SkillUploadResult | null>(null)
  const upload = useUploadSkill()

  const reset = () => {
    setFile(null)
    setOverwrite(false)
    setResult(null)
    upload.reset()
  }

  const close = () => {
    if (upload.isPending) return
    onClose()
    reset()
  }

  const pick = (f: File | undefined) => {
    if (!f) return
    setFile(f)
    setResult(null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    pick(e.dataTransfer.files[0])
  }

  const submit = () => {
    if (!file) return
    upload.mutate({ file, overwrite }, { onSuccess: (res) => setResult(res.data) })
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Upload skill</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        {result ? (
          <UploadResultView result={result} />
        ) : (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Zip berisi <code>SKILL.md</code> di root (satu skill) atau <code>&lt;folder&gt;/SKILL.md</code> untuk
              banyak skill. Hanya file teks yang dipasang; script dibuang. Maks 10 MB.
            </Typography>

            <Box
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors"
              sx={{
                borderColor: dragging ? 'primary.main' : 'divider',
                bgcolor: dragging ? 'action.hover' : 'transparent',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              {file ? <FileArchive size={28} /> : <Upload size={28} />}
              {file ? (
                <>
                  <Typography sx={{ fontWeight: 600 }}>{file.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatBytes(file.size)} · klik untuk ganti file
                  </Typography>
                </>
              ) : (
                <>
                  <Typography sx={{ fontWeight: 600 }}>Tarik file ke sini atau klik untuk memilih</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    .zip atau .skill
                  </Typography>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".zip,.skill"
                hidden
                onChange={(e) => {
                  pick(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </Box>

            <FormControlLabel
              control={<Switch checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />}
              label="Timpa skill dengan nama yang sama"
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {result ? (
          <>
            <Button onClick={reset} color="inherit">
              Upload lagi
            </Button>
            <Button onClick={close} variant="contained">
              Selesai
            </Button>
          </>
        ) : (
          <>
            <Button onClick={close} color="inherit" disabled={upload.isPending}>
              Batal
            </Button>
            <Button
              onClick={submit}
              variant="contained"
              disabled={!file || upload.isPending}
              startIcon={upload.isPending ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
            >
              Upload
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

function UploadResultView({ result }: { result: SkillUploadResult }) {
  const skipped = result.skipped_files ?? []
  return (
    <div className="flex flex-col gap-3">
      <Alert severity="success">{result.skills.length} skill terpasang.</Alert>
      {result.skills.map((s) => (
        <Box key={s.name} className="rounded-lg border p-3" sx={{ borderColor: 'divider' }}>
          <div className="flex flex-wrap items-center gap-2">
            <Typography sx={{ fontWeight: 600 }} className="font-mono">
              {s.name}
            </Typography>
            {s.replaced && <Chip size="small" label="Menimpa versi lama" color="warning" variant="outlined" />}
            {s.has_short && <Chip size="small" label="SHORT.md" variant="outlined" />}
            <Chip size="small" label={`${s.files} file`} variant="outlined" />
          </div>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {s.description}
          </Typography>
        </Box>
      ))}
      {skipped.length > 0 && (
        <Alert severity="warning">
          {skipped.length} file dilewati (bukan file teks):
          <ul className="mt-1 list-disc pl-5 font-mono text-xs">
            {skipped.slice(0, 20).map((f) => (
              <li key={f}>{f}</li>
            ))}
            {skipped.length > 20 && <li>dan {skipped.length - 20} lainnya</li>}
          </ul>
        </Alert>
      )}
    </div>
  )
}
