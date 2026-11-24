import type { ReactNode } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Typography } from '@mui/material'
import { formatDateTime, formatMs, formatNumber, formatScore } from '@/lib/format'
import type { UsageLog } from './api'

export function UsageLogDialog({ log, onClose }: { log: UsageLog | null; onClose: () => void }) {
  return (
    <Dialog open={!!log} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>Detail request</DialogTitle>
      <DialogContent dividers>
        {log && (
          <div className="flex flex-col gap-4">
            <Group title="Request">
              <Row label="Waktu" value={formatDateTime(log.created_at)} />
              <Row label="Model" value={log.model} mono />
              <Row label="Path" value={log.path} mono />
              <Row label="Stream" value={log.stream ? 'Ya' : 'Tidak'} />
              <Row label="Status" value={`${log.status}${log.aborted ? ' (diputus client)' : ''}`} />
              <Row label="Latensi" value={formatMs(log.latency_ms)} />
            </Group>
            <Group title="Skill">
              <Row label="Skill" value={log.skill_name ?? 'Tanpa skill'} mono />
              <Row label="Skor" value={formatScore(log.skill_score)} />
              <Row label="Varian" value={log.skill_variant ?? '-'} />
              <Row label="Token skill" value={`± ${formatNumber(log.extra_tokens_est)} / budget ${formatNumber(log.budget_tokens)}`} />
              <Row label="Metode seleksi" value={log.selection_method || '-'} />
              <Row label="Cache seleksi / sesi" value={`${log.selection_cache || '-'} / ${log.session_cache || '-'}`} />
              <Row label="Token pemilih cadangan" value={formatNumber(log.fallback_tokens)} />
            </Group>
            <Group title="Memori">
              <Row label="Token context pack" value={`± ${formatNumber(log.context_pack_tokens_est)}`} />
              <Row label="Catatan memori" value={`${log.memory_notes} (± ${formatNumber(log.memory_tokens_est)} token)`} />
              {log.memory_note_ids && <Row label="ID catatan" value={log.memory_note_ids.split(',').join('\n')} mono />}
            </Group>
            <Group title="MCP">
              <Row label="Tool dikirim" value={`${log.mcp_tools_offered} (± ${formatNumber(log.mcp_tools_tokens_est)} token)`} />
              <Row label="Panggilan tool" value={formatNumber(log.mcp_tool_calls)} />
              {log.mcp_tool_names && <Row label="Tool dipanggil" value={log.mcp_tool_names.split(',').join('\n')} mono />}
              <Row label="Putaran model" value={formatNumber(log.mcp_steps)} />
            </Group>
            <Group title="Token dari 9Router">
              <Row label="Prompt" value={formatNumber(log.prompt_tokens)} />
              <Row label="Jawaban" value={formatNumber(log.completion_tokens)} />
              <Row label="Cache" value={formatNumber(log.cached_tokens)} />
            </Group>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Tutup</Button>
      </DialogActions>
    </Dialog>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>{title}</Typography>
      <Divider />
      <dl className="mt-2 grid grid-cols-[150px_1fr] gap-x-3 gap-y-1.5 text-sm">{children}</dl>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <>
      <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography component="dd" variant="body2" className={`break-all whitespace-pre-line ${mono ? 'font-mono' : ''}`}>
        {value}
      </Typography>
    </>
  )
}
