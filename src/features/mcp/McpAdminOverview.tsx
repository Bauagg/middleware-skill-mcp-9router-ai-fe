import { useMemo } from 'react'
import {
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { CircleCheck, KeyRound } from 'lucide-react'
import { OwnerChip } from '@/components/common/OwnerChip'
import { ErrorState } from '@/components/common/States'
import { formatDateTime } from '@/lib/format'
import { useMcpAdminOverview, type McpUserServer } from './api'

function kind(s: McpUserServer): string {
  if (s.installed) return s.global ? 'Dari GitHub · semua user' : 'Dari GitHub · pribadi'
  return s.global ? 'Semua user' : 'Pribadi'
}

/** Admin-only overview: every user's extra MCP servers and who is logged in where. */
export function McpAdminOverview() {
  const overview = useMcpAdminOverview(true)
  const data = overview.data

  // logged-in users per server, for the summary chips
  const perServer = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of data?.connections ?? []) {
      if (c.logged_in) counts.set(c.server, (counts.get(c.server) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [data])

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Typography variant="h6" component="h2">
          Semua user
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Khusus admin: server MCP tambahan milik tiap user dan status login mereka.
        </Typography>
      </div>

      {overview.isFetching && <LinearProgress />}
      {overview.isError && <ErrorState error={overview.error} onRetry={() => overview.refetch()} />}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Typography variant="body2" sx={{ color: 'text.secondary', mr: 0.5 }}>
              Server bawaan (mcp.json):
            </Typography>
            {data.builtin.length === 0 ? (
              <Typography variant="body2">-</Typography>
            ) : (
              data.builtin.map((name) => <Chip key={name} size="small" variant="outlined" label={name} />)
            )}
          </div>

          {perServer.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Typography variant="body2" sx={{ color: 'text.secondary', mr: 0.5 }}>
                User yang sudah login:
              </Typography>
              {perServer.map(([server, n]) => (
                <Chip key={server} size="small" variant="outlined" icon={<KeyRound size={13} />} label={`${server} · ${n} user`} />
              ))}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <Paper variant="outlined">
              <Typography sx={{ fontWeight: 600, fontSize: 14, px: 2, pt: 2, pb: 1 }}>
                Server tambahan ({data.user_servers.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Server</TableCell>
                      <TableCell>Pemilik</TableCell>
                      <TableCell>Jenis</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Dibuat</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.user_servers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                          Belum ada server tambahan.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.user_servers.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }} className="font-mono">
                            {s.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }} className="font-mono break-all">
                            {s.url}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <OwnerChip userId={s.user_id} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Chip size="small" variant="outlined" label={kind(s)} />
                            {s.shared_login && <Chip size="small" variant="outlined" label="Login bersama" />}
                          </div>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>
                          {formatDateTime(s.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper variant="outlined">
              <Typography sx={{ fontWeight: 600, fontSize: 14, px: 2, pt: 2, pb: 1 }}>
                Login user ({data.connections.length})
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Server</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Token berlaku sampai</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.connections.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                          Belum ada user yang login ke server MCP.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.connections.map((c) => (
                      <TableRow key={`${c.user_id}:${c.server}`}>
                        <TableCell>
                          <OwnerChip userId={c.user_id} />
                        </TableCell>
                        <TableCell className="font-mono">{c.server}</TableCell>
                        <TableCell>
                          {c.logged_in ? (
                            <Chip size="small" color="success" variant="outlined" icon={<CircleCheck size={13} />} label="Login" />
                          ) : (
                            <Chip size="small" variant="outlined" label="Belum login" />
                          )}
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, whiteSpace: 'nowrap' }}>
                          {formatDateTime(c.expires_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </div>
        </>
      )}
    </section>
  )
}
