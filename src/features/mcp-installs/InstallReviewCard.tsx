import type { ReactNode } from 'react'
import { Alert, Box, Button, Chip, Link, Paper, Typography } from '@mui/material'
import { Ban, Check, ExternalLink, GitCommitHorizontal } from 'lucide-react'
import { OwnerChip } from '@/components/common/OwnerChip'
import { formatDateTime } from '@/lib/format'
import type { McpInstall } from './api'
import { installStatusMeta } from './status'

interface Props {
  install: McpInstall
  busy?: boolean
  onApprove: () => void
  onReject: () => void
}

/** Everything an admin needs to read before letting this repo run in a container. */
export function InstallReviewCard({ install: i, busy, onApprove, onReject }: Props) {
  const meta = installStatusMeta[i.status] ?? installStatusMeta.failed
  const StatusIcon = meta.icon
  const canApprove = i.status === 'pending_review' || i.status === 'rejected'
  const canReject = i.status === 'pending_review'
  const envKeys = i.env_keys ?? []
  const envSet = new Set(i.env_set ?? [])
  const keywords = i.keywords ?? []

  return (
    <Paper variant="outlined" className="flex flex-col gap-4 p-4 sm:p-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <Typography sx={{ fontWeight: 700, fontSize: 18 }} className="mr-auto font-mono">
          {i.name}
        </Typography>
        <OwnerChip userId={i.user_id} />
        {i.global && (
          <Chip size="small" variant="outlined" label={i.per_user ? 'Semua user · tidak sharing' : 'Semua user · sharing'} />
        )}
        <Chip
          size="small"
          color={meta.color}
          icon={<StatusIcon size={14} className={i.status === 'starting' ? 'animate-spin' : undefined} />}
          label={meta.label}
        />
      </div>

      {/* repo + exact commit */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link href={i.repo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
          {i.owner}/{i.repo}
          <ExternalLink size={14} />
        </Link>
        <Link
          href={`${i.repo_url.replace(/\.git$/, '')}/tree/${i.commit_sha}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono"
          title="Commit yang akan dijalankan"
        >
          <GitCommitHorizontal size={14} />
          {i.commit_sha.slice(0, 12)}
        </Link>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Diajukan {formatDateTime(i.created_at)}
        </Typography>
      </div>

      {i.purpose && (
        <Section label="Tujuan">
          <Typography variant="body2" className="whitespace-pre-wrap">
            {i.purpose}
          </Typography>
        </Section>
      )}

      <div className="flex flex-wrap gap-2">
        {i.runtime && <Chip size="small" variant="outlined" label={`Runtime: ${i.runtime}`} />}
        <Chip
          size="small"
          variant="outlined"
          label={i.transport === 'http' ? `Transport: http ${i.http_path}` : 'Transport: stdio'}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section label="Perintah install">
          <Code>{i.install_command || '(tidak ada)'}</Code>
        </Section>
        <Section label="Perintah start">
          <Code>{i.start_command}</Code>
        </Section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section label="Data rahasia yang dibutuhkan">
          {envKeys.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Tidak ada
            </Typography>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {envKeys.map((k) => (
                <Chip
                  key={k}
                  size="small"
                  variant="outlined"
                  className="font-mono"
                  label={`${k} · ${envSet.has(k) ? 'sudah diisi' : 'belum diisi'}`}
                />
              ))}
            </div>
          )}
        </Section>
        <Section label="Kata kunci">
          {keywords.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              -
            </Typography>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((k) => (
                <Chip key={k} size="small" variant="outlined" label={k} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {i.error && (
        <Alert severity={i.status === 'rejected' ? 'info' : 'error'}>
          {i.status === 'rejected' ? `Alasan ditolak: ${i.error}` : i.error}
        </Alert>
      )}

      {(canApprove || canReject || i.reviewed_at) && (
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="caption" sx={{ color: 'text.secondary' }} className="mr-auto">
            {i.reviewed_at ? `Ditinjau ${formatDateTime(i.reviewed_at)}` : ''}
          </Typography>
          {canReject && (
            <Button variant="outlined" color="error" startIcon={<Ban size={16} />} onClick={onReject} disabled={busy}>
              Tolak
            </Button>
          )}
          {canApprove && (
            <Button variant="contained" startIcon={<Check size={16} />} onClick={onApprove} disabled={busy}>
              {i.status === 'rejected' ? 'Setujui ulang' : 'Setujui'}
            </Button>
          )}
        </div>
      )}
    </Paper>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      {children}
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <Box
      component="pre"
      className="overflow-x-auto rounded-lg px-3 py-2.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all"
      sx={{ bgcolor: 'action.hover', m: 0 }}
    >
      {children}
    </Box>
  )
}
