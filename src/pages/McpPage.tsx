import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  LinearProgress,
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
import {
  CircleCheck,
  CircleDashed,
  CircleOff,
  CircleX,
  ExternalLink,
  Globe,
  KeyRound,
  LogOut,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import {
  useLogoutMcpServer,
  useMcpServers,
  useMcpTools,
  useRefreshMcpServer,
  useRemoveMcpServer,
  type McpServer,
  type McpState,
} from '@/features/mcp/api'
import { AddMcpServerDialog } from '@/features/mcp/AddMcpServerDialog'
import { McpAdminOverview } from '@/features/mcp/McpAdminOverview'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDateTime, formatScore } from '@/lib/format'
import { useIsAdmin } from '@/stores/authStore'

const stateMeta: Record<
  McpState,
  { label: string; color: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: LucideIcon }
> = {
  connected: { label: 'Terhubung', color: 'success', icon: CircleCheck },
  needs_login: { label: 'Perlu login', color: 'warning', icon: KeyRound },
  connecting: { label: 'Menghubungkan', color: 'info', icon: CircleDashed },
  error: { label: 'Error', color: 'error', icon: CircleX },
  disabled: { label: 'Dimatikan', color: 'default', icon: CircleOff },
}

export function McpPage() {
  const servers = useMcpServers()
  const refresh = useRefreshMcpServer()
  const logout = useLogoutMcpServer()
  const remove = useRemoveMcpServer()
  const isAdmin = useIsAdmin()
  const [loggingOut, setLoggingOut] = useState<McpServer | null>(null)
  const [removing, setRemoving] = useState<McpServer | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim())
  const tools = useMcpTools(q)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Middleware menjadi klien MCP: tool dari server yang terhubung dikirim ke model bila pesan user menyinggung aplikasinya."
        actions={
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RefreshCw size={16} />}
              onClick={() => servers.refetch()}
              disabled={servers.isFetching}
            >
              Muat ulang
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Tambah server
            </Button>
          </>
        }
      />

      <section className="flex flex-col gap-3">
        <Typography variant="h6" component="h2">
          Server
        </Typography>
        {servers.isPending ? (
          <LoadingState />
        ) : servers.isError ? (
          <ErrorState error={servers.error} onRetry={() => servers.refetch()} />
        ) : servers.data.length === 0 ? (
          <EmptyState icon={Plug} title="Belum ada server MCP" description="Tambah server lewat tombol Tambah server, atau daftarkan di mcp.json backend." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {servers.data.map((s) => {
              const meta = stateMeta[s.state] ?? stateMeta.error
              const Icon = meta.icon
              const refreshing = refresh.isPending && refresh.variables === s.name
              // with a shared login every user rides on the admin's account: only the admin manages it
              const managesLogin = !s.shared_login || isAdmin
              const removable = s.own || (s.global && isAdmin)
              return (
                <Paper key={s.name} variant="outlined" className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <Typography sx={{ fontWeight: 600, fontSize: 17 }} className="capitalize">
                        {s.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} className="font-mono break-all">
                        {s.url}
                      </Typography>
                    </div>
                    <Chip size="small" color={meta.color} icon={<Icon size={14} />} label={meta.label} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {s.global ? (
                      <Chip size="small" color="primary" variant="outlined" icon={<Globe size={13} />} label="Semua user" />
                    ) : s.own ? (
                      <Chip size="small" variant="outlined" icon={<UserRound size={13} />} label="Pribadi" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Bawaan" />
                    )}
                    {s.shared_login && <Chip size="small" variant="outlined" icon={<Users size={13} />} label="Login bersama" />}
                    <Chip size="small" variant="outlined" label={`${s.tools} tool`} />
                    <Chip size="small" variant="outlined" label={`${s.read_only_tools} hanya-baca`} />
                    <Chip size="small" variant="outlined" label={s.logged_in ? 'Sudah login' : 'Belum login'} />
                  </div>

                  {(s.token_expires_at || s.refreshed_at) && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {s.refreshed_at && `Tool diambil ${formatDateTime(s.refreshed_at)}`}
                      {s.refreshed_at && s.token_expires_at && ' · '}
                      {s.token_expires_at && `Token berlaku sampai ${formatDateTime(s.token_expires_at)}`}
                    </Typography>
                  )}

                  {s.error && <Alert severity="error">{s.error}</Alert>}

                  {s.shared_login && !isAdmin && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Server ini memakai login admin, jadi kamu tidak perlu menghubungkannya sendiri.
                    </Typography>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2">
                  {s.state !== 'disabled' && (
                    <>
                      {managesLogin && (!s.logged_in || s.state === 'needs_login') && (
                        <Button
                          variant="contained"
                          startIcon={<ExternalLink size={16} />}
                          href={s.connect_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Hubungkan
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
                        onClick={() => refresh.mutate(s.name)}
                        disabled={refreshing}
                      >
                        Ambil ulang tool
                      </Button>
                      {managesLogin && s.logged_in && (
                        <Button color="error" startIcon={<LogOut size={16} />} onClick={() => setLoggingOut(s)}>
                          Putuskan
                        </Button>
                      )}
                    </>
                  )}
                  {removable && (
                    <Button color="error" startIcon={<Trash2 size={16} />} onClick={() => setRemoving(s)} sx={{ ml: 'auto' }}>
                      Hapus server
                    </Button>
                  )}
                  </div>
                </Paper>
              )
            })}
          </div>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          "Hubungkan" membuka halaman login server di tab baru. Setelah login berhasil, kembali ke tab ini dan
          status akan diperbarui otomatis.
        </Typography>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="h6" component="h2">
            Tool
          </Typography>
          <TextField
            size="small"
            placeholder="Uji pesan, mis. bikin poster promo di canva"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { sm: 380 } }}
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
        </div>
        {q && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Skor tiap tool untuk pesan ini. Tool bertanda "Dikirim" akan ikut dikirim ke model.
          </Typography>
        )}
        {tools.isFetching && <LinearProgress />}
        {tools.isError ? (
          <ErrorState error={tools.error} onRetry={() => tools.refetch()} />
        ) : tools.data && tools.data.length === 0 ? (
          <EmptyState icon={Plug} title="Belum ada tool" description="Tool muncul setelah server MCP terhubung." />
        ) : tools.data ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tool</TableCell>
                  <TableCell>Server</TableCell>
                  {q && <TableCell align="right">Skor</TableCell>}
                  {q && <TableCell>Status</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {tools.data.map((t) => (
                  <TableRow key={t.name} hover selected={!!t.selected}>
                    <TableCell sx={{ maxWidth: 560 }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }} className="font-mono">
                          {t.tool}
                        </Typography>
                        {t.read_only && <Chip size="small" variant="outlined" label="Hanya-baca" />}
                      </div>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} className="line-clamp-2">
                        {t.title ? `${t.title}. ` : ''}
                        {t.description}
                      </Typography>
                    </TableCell>
                    <TableCell className="capitalize">{t.server}</TableCell>
                    {q && (
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatScore(t.score)}
                      </TableCell>
                    )}
                    {q && (
                      <TableCell>
                        {t.selected ? (
                          <Chip size="small" color="success" icon={<CircleCheck size={14} />} label="Dikirim" />
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Tidak
                          </Typography>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </section>

      {isAdmin && <McpAdminOverview />}

      <ConfirmDialog
        open={!!loggingOut}
        title={`Putuskan ${loggingOut?.name ?? ''}?`}
        description="Token login server ini dihapus. Tool-nya tidak lagi tersedia sampai kamu menghubungkan ulang."
        confirmLabel="Putuskan"
        destructive
        loading={logout.isPending}
        onClose={() => setLoggingOut(null)}
        onConfirm={() => loggingOut && logout.mutate(loggingOut.name, { onSuccess: () => setLoggingOut(null) })}
      />
      <ConfirmDialog
        open={!!removing}
        title={`Hapus server ${removing?.name ?? ''}?`}
        description={
          removing?.global
            ? 'Server ini dibuat admin untuk semua user. Menghapusnya membuat server dan tool-nya hilang untuk semua user.'
            : 'Server pribadi ini dan login-nya dihapus.'
        }
        confirmLabel="Hapus"
        destructive
        loading={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.name, { onSuccess: () => setRemoving(null) })}
      />
      <AddMcpServerDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
