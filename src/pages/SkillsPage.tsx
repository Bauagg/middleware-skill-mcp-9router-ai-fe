import { useState } from 'react'
import {
  Button,
  Chip,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { Download, Eye, FlaskConical, RefreshCw, Sparkles, TriangleAlert, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import { downloadSkills, useSkills } from '@/features/skills/api'
import { SkillMatchTester } from '@/features/skills/SkillMatchTester'
import { SkillPreviewDialog } from '@/features/skills/SkillPreviewDialog'
import { SkillUploadDialog } from '@/features/skills/SkillUploadDialog'
import { getErrorMessage } from '@/lib/axios'
import { formatBytes, formatDateTime } from '@/lib/format'
import { notify } from '@/lib/notify'

export function SkillsPage() {
  const [tab, setTab] = useState<'list' | 'match'>('list')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const skills = useSkills()
  const navigate = useNavigate()
  /** '' = all skills, a name = one skill, null = idle */
  const [exporting, setExporting] = useState<string | null>(null)

  const exportSkills = async (name?: string) => {
    setExporting(name ?? '')
    try {
      await downloadSkills(name ? [name] : undefined)
    } catch (error) {
      notify.error(getErrorMessage(error))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Skill dibaca dari folder skills/ di backend. Middleware memilih skill yang paling cocok untuk setiap pesan."
        actions={
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RefreshCw size={16} />}
              onClick={() => skills.refetch()}
              disabled={skills.isFetching}
            >
              Muat ulang
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Download size={16} />}
              onClick={() => exportSkills()}
              disabled={!skills.data?.length || exporting !== null}
            >
              Export semua
            </Button>
            <Button variant="contained" startIcon={<Upload size={16} />} onClick={() => setUploadOpen(true)}>
              Upload skill
            </Button>
          </>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="list" label={`Daftar skill${skills.data ? ` (${skills.data.length})` : ''}`} />
        <Tab value="match" label="Uji pemilihan" />
      </Tabs>

      {tab === 'match' ? (
        <SkillMatchTester />
      ) : skills.isPending ? (
        <LoadingState />
      ) : skills.isError ? (
        <ErrorState error={skills.error} onRetry={() => skills.refetch()} />
      ) : skills.data.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Belum ada skill"
          description="Upload zip berisi SKILL.md untuk mulai."
          action={
            <Button variant="contained" startIcon={<Upload size={16} />} onClick={() => setUploadOpen(true)}>
              Upload skill
            </Button>
          }
        />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Skill</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>File</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Ukuran</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Diubah</TableCell>
                <TableCell align="right">Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {skills.data.map((s) => (
                <TableRow key={s.name} hover>
                  <TableCell sx={{ maxWidth: 520 }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography sx={{ fontWeight: 600 }} className="font-mono">
                        {s.name}
                      </Typography>
                      {s.has_short && <Chip size="small" variant="outlined" label="SHORT.md" />}
                      {s.error && (
                        <Chip size="small" color="error" icon={<TriangleAlert size={14} />} label="Rusak" />
                      )}
                    </div>
                    <Typography variant="body2" sx={{ color: s.error ? 'error.main' : 'text.secondary', mt: 0.5 }} className="line-clamp-2">
                      {s.error ?? s.description}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{s.files}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>
                    {formatBytes(s.size_bytes)}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, whiteSpace: 'nowrap' }}>
                    {formatDateTime(s.updated_at)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Preview isi">
                      <span>
                        <IconButton onClick={() => setPreviewName(s.name)} disabled={!!s.error} aria-label={`Preview ${s.name}`}>
                          <Eye size={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Download zip">
                      <span>
                        <IconButton
                          onClick={() => exportSkills(s.name)}
                          disabled={!!s.error || exporting !== null}
                          aria-label={`Download ${s.name}`}
                        >
                          <Download size={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Eval skill ini">
                      <span>
                        <IconButton
                          onClick={() => navigate(`/evals?skill=${encodeURIComponent(s.name)}&new=1`)}
                          disabled={!!s.error}
                          aria-label={`Eval ${s.name}`}
                        >
                          <FlaskConical size={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <SkillUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <SkillPreviewDialog name={previewName} onClose={() => setPreviewName(null)} />
    </div>
  )
}
