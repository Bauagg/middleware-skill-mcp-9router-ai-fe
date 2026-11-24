import { useMemo, useState, type ReactNode } from 'react'
import {
  Chip,
  InputAdornment,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { Activity, ChartColumn, Clock, Coins, Search, Sparkles } from 'lucide-react'
import { OwnerChip } from '@/components/common/OwnerChip'
import { StatTile } from '@/components/common/StatTile'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import { useUsageLogs, useUsageSummary, type UsageSummary } from '@/features/usage/api'
import { UsageLogDialog } from '@/features/usage/UsageLogDialog'
import type { UsageLog } from '@/features/usage/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDateTime, formatDecimal, formatMs, formatNumber, formatScore, toDateInput } from '@/lib/format'
import { useIsAdmin } from '@/stores/authStore'

type Preset = '7' | '30' | 'all' | 'custom'

function presetRange(preset: Preset): { from: string; to: string } {
  if (preset === 'all' || preset === 'custom') return { from: '', to: '' }
  const to = new Date()
  to.setDate(to.getDate() + 1) // `to` is exclusive: include today
  const from = new Date()
  from.setDate(from.getDate() - (Number(preset) - 1))
  return { from: toDateInput(from), to: toDateInput(to) }
}

export function UsagePage() {
  const [preset, setPreset] = useState<Preset>('30')
  const [range, setRange] = useState(() => presetRange('30'))
  // admins see every user's usage; they can narrow it to one user
  const isAdmin = useIsAdmin()
  const [userInput, setUserInput] = useState('')
  const userId = useDebouncedValue(userInput.trim())
  const summary = useUsageSummary({ ...range, user_id: userId })

  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(20)
  const [modelInput, setModelInput] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const model = useDebouncedValue(modelInput.trim())
  const skill = useDebouncedValue(skillInput.trim())
  const logs = useUsageLogs({ page: page + 1, limit, model, skill, user_id: userId })
  const [selected, setSelected] = useState<UsageLog | null>(null)

  const choosePreset = (p: Preset | null) => {
    if (!p) return
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Summary */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Typography variant="h6" component="h2">
            Ringkasan
          </Typography>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <FilterField
                label="User ID"
                placeholder="Semua user"
                value={userInput}
                onChange={(v) => {
                  setUserInput(v)
                  setPage(0)
                }}
              />
            )}
            <ToggleButtonGroup size="small" exclusive value={preset} onChange={(_, v) => choosePreset(v)}>
              <ToggleButton value="7">7 hari</ToggleButton>
              <ToggleButton value="30">30 hari</ToggleButton>
              <ToggleButton value="all">Semua</ToggleButton>
              <ToggleButton value="custom">Atur</ToggleButton>
            </ToggleButtonGroup>
            {preset === 'custom' && (
              <>
                <TextField
                  size="small"
                  type="date"
                  label="Dari"
                  value={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Sampai (tidak termasuk)"
                  value={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </>
            )}
          </div>
        </div>

        {summary.isError ? (
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        ) : (
          <SummaryView summary={summary.data} loading={summary.isPending} fetching={summary.isFetching} />
        )}
      </section>

      {/* Logs */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="h6" component="h2">
            Log request
          </Typography>
          <div className="flex flex-wrap gap-2">
            <FilterField label="Model" value={modelInput} onChange={(v) => { setModelInput(v); setPage(0) }} />
            <FilterField label="Skill" value={skillInput} onChange={(v) => { setSkillInput(v); setPage(0) }} />
          </div>
        </div>

        {logs.isPending ? (
          <LoadingState />
        ) : logs.isError ? (
          <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
        ) : logs.data.logs.length === 0 ? (
          <EmptyState icon={ChartColumn} title="Belum ada log" description="Log muncul setelah ada request ke /v1/chat/completions." />
        ) : (
          <Paper variant="outlined">
            {logs.isFetching && <LinearProgress />}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Waktu</TableCell>
                    {isAdmin && <TableCell>User</TableCell>}
                    <TableCell>Model</TableCell>
                    <TableCell>Skill</TableCell>
                    <TableCell align="right">Token prompt / jawaban</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      Token sisipan
                    </TableCell>
                    <TableCell align="right">Latensi</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.data.logs.map((log) => {
                    const injected = log.extra_tokens_est + log.context_pack_tokens_est + log.memory_tokens_est + log.mcp_tools_tokens_est
                    return (
                      <TableRow key={log.id} hover onClick={() => setSelected(log)} className="cursor-pointer">
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <OwnerChip userId={log.user_id} />
                          </TableCell>
                        )}
                        <TableCell className="font-mono" sx={{ whiteSpace: 'nowrap' }}>
                          {log.model}
                        </TableCell>
                        <TableCell>
                          {log.skill_name ? (
                            <span className="font-mono">
                              {log.skill_name}
                              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                                {formatScore(log.skill_score)}
                              </Typography>
                            </span>
                          ) : (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {formatNumber(log.prompt_tokens)} / {formatNumber(log.completion_tokens)}
                        </TableCell>
                        <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' }, fontVariantNumeric: 'tabular-nums' }}>
                          {formatNumber(injected)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {formatMs(log.latency_ms)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={log.aborted ? 'warning' : log.status >= 400 ? 'error' : 'success'}
                            label={log.aborted ? 'Diputus' : log.status}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={logs.data.meta.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={limit}
              onRowsPerPageChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(0)
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="Per halaman"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
            />
          </Paper>
        )}
      </section>

      <UsageLogDialog log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function FilterField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <TextField
      size="small"
      placeholder={placeholder ?? `Filter ${label.toLowerCase()}`}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ width: 180 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} />
            </InputAdornment>
          ),
        },
      }}
    />
  )
}

function weightedAvg(rows: UsageSummary['skills'], pick: (r: UsageSummary['skills'][number]) => number | null, weight: (r: UsageSummary['skills'][number]) => number) {
  let sum = 0
  let total = 0
  for (const r of rows) {
    const v = pick(r)
    const w = weight(r)
    if (v == null || w === 0) continue
    sum += v * w
    total += w
  }
  return total ? sum / total : null
}

function SummaryView({ summary, loading, fetching }: { summary?: UsageSummary; loading: boolean; fetching: boolean }) {
  const stats = useMemo(() => {
    const rows = summary?.skills ?? []
    const requests = rows.reduce((s, r) => s + r.requests, 0)
    const withSkill = rows.filter((r) => r.skill !== '').reduce((s, r) => s + r.requests, 0)
    return {
      requests,
      withSkill,
      latency: weightedAvg(rows, (r) => r.avg_latency_ms, (r) => r.requests),
      prompt: weightedAvg(rows, (r) => r.avg_prompt_tokens, (r) => r.with_usage),
      extra: weightedAvg(rows.filter((r) => r.skill !== ''), (r) => r.avg_extra_tokens_est, (r) => r.requests),
    }
  }, [summary])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Activity} label="Request" value={formatNumber(stats.requests)} loading={loading} />
        <StatTile
          icon={Sparkles}
          label="Dengan skill"
          value={stats.requests ? `${Math.round((stats.withSkill / stats.requests) * 100)}%` : '-'}
          caption={`${formatNumber(stats.withSkill)} request`}
          loading={loading}
        />
        <StatTile icon={Clock} label="Rata-rata latensi" value={formatMs(stats.latency)} loading={loading} />
        <StatTile
          icon={Coins}
          label="Rata-rata token prompt"
          value={formatNumber(stats.prompt)}
          caption={stats.extra != null ? `± ${formatNumber(stats.extra)} dari skill` : undefined}
          loading={loading}
        />
      </div>

      {summary && (
        <>
          <Paper variant="outlined">
            {fetching && <LinearProgress />}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Skill</TableCell>
                    <TableCell align="right">Request</TableCell>
                    <TableCell align="right">Token skill</TableCell>
                    <TableCell align="right">Token prompt</TableCell>
                    <TableCell align="right">Token jawaban</TableCell>
                    <TableCell align="right">Latensi</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.skills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        Tidak ada request di rentang ini.
                      </TableCell>
                    </TableRow>
                  )}
                  {summary.skills.map((r) => (
                    <TableRow key={r.skill || '__none'}>
                      <TableCell className={r.skill ? 'font-mono' : ''} sx={r.skill ? undefined : { color: 'text.secondary' }}>
                        {r.skill || 'Tanpa skill'}
                      </TableCell>
                      <Num>{formatNumber(r.requests)}</Num>
                      <Num>{formatNumber(r.avg_extra_tokens_est)}</Num>
                      <Num>{formatNumber(r.avg_prompt_tokens)}</Num>
                      <Num>{formatNumber(r.avg_completion_tokens)}</Num>
                      <Num>{formatMs(r.avg_latency_ms)}</Num>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', px: 2, py: 1 }}>
              Semua kolom token dan latensi adalah rata-rata per request.
            </Typography>
          </Paper>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Breakdown title="Cache seleksi skill" data={summary.selection_cache} />
            <Breakdown title="Cache sesi percakapan" data={summary.session_cache} />
            <Breakdown title="Varian skill" data={summary.variants} />
            <Breakdown title="Metode seleksi" data={summary.selection_methods} />
            <Breakdown
              title="Memori"
              rows={[
                ['Dengan context pack', formatNumber(summary.memory.with_context_pack)],
                ['Dengan catatan memori', formatNumber(summary.memory.with_memory_notes)],
                ['Rata-rata token context pack', formatNumber(summary.memory.avg_context_pack_tokens_est)],
                ['Rata-rata token catatan', formatNumber(summary.memory.avg_memory_tokens_est)],
              ]}
            />
            <Breakdown
              title="MCP"
              rows={[
                ['Request dengan tool', formatNumber(summary.mcp.with_tools_offered)],
                ['Request yang memanggil tool', formatNumber(summary.mcp.with_tool_calls)],
                ['Rata-rata token definisi tool', formatNumber(summary.mcp.avg_tools_tokens_est)],
                ['Rata-rata panggilan', formatDecimal(summary.mcp.avg_tool_calls)],
              ]}
            />
          </div>
        </>
      )}
    </div>
  )
}

function Num({ children }: { children: ReactNode }) {
  return (
    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {children}
    </TableCell>
  )
}

function Breakdown({ title, data, rows }: { title: string; data?: Record<string, number>; rows?: [string, string][] }) {
  const entries: [string, string][] =
    rows ?? Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, formatNumber(v)])
  return (
    <Paper variant="outlined" className="p-4">
      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1.5 }}>{title}</Typography>
      {entries.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Belum ada data
        </Typography>
      ) : (
        <dl className="flex flex-col gap-1.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 text-sm">
              <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
                {k}
              </Typography>
              <Typography component="dd" variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {v}
              </Typography>
            </div>
          ))}
        </dl>
      )}
    </Paper>
  )
}
