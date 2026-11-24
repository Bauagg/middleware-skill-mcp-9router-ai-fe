import { Alert, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material'
import { Activity, ArrowRight, Brain, Plug, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatTile } from '@/components/common/StatTile'
import { navSectionsFor } from '@/config/navigation'
import { useBackendPing } from '@/features/health/api'
import { useMcpServers } from '@/features/mcp/api'
import { useMemoryNotes } from '@/features/memory-notes/api'
import { useSkills } from '@/features/skills/api'
import { useUsageSummary } from '@/features/usage/api'
import { getErrorMessage } from '@/lib/axios'
import { formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'

export function DashboardPage() {
  const ping = useBackendPing()
  const skills = useSkills()
  const proposed = useMemoryNotes({ status: 'proposed', page: 1, limit: 1 })
  const servers = useMcpServers()
  const usage = useUsageSummary({})
  const role = useAuthStore((s) => s.user?.role)
  const shortcuts = navSectionsFor(role).flatMap((s) => s.items).filter((item) => item.path !== '/')

  const connected = servers.data?.filter((s) => s.state === 'connected').length ?? 0
  const enabled = servers.data?.filter((s) => s.state !== 'disabled').length ?? 0
  const requests = usage.data?.skills.reduce((sum, r) => sum + r.requests, 0) ?? 0
  const brokenSkills = skills.data?.filter((s) => s.error).length ?? 0

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent className="flex items-center gap-3">
          <Activity size={20} />
          <Typography className="flex-1">Status backend</Typography>
          {ping.isPending && <Chip label="Memeriksa…" size="small" />}
          {ping.isSuccess && <Chip label="Online" color="success" size="small" />}
          {ping.isError && <Chip label="Offline" color="error" size="small" />}
        </CardContent>
        {ping.isError && (
          <Alert severity="warning" className="rounded-none">
            {getErrorMessage(ping.error)}. Pastikan backend jalan di alamat VITE_PROXY_TARGET.
          </Alert>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Sparkles}
          label="Skill terpasang"
          value={formatNumber(skills.data?.length)}
          caption={brokenSkills ? `${brokenSkills} rusak` : undefined}
          loading={skills.isPending}
        />
        <StatTile
          icon={Brain}
          label="Catatan menunggu review"
          value={formatNumber(proposed.data?.meta.total)}
          caption={<Link to="/memory-notes" className="underline">Buka antrean</Link>}
          loading={proposed.isPending}
        />
        <StatTile
          icon={Plug}
          label="Server MCP terhubung"
          value={servers.data ? `${connected} / ${enabled}` : '-'}
          loading={servers.isPending}
        />
        <StatTile icon={Activity} label="Request tercatat" value={formatNumber(requests)} caption="Sepanjang waktu" loading={usage.isPending} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.path} variant="outlined">
              <CardActionArea component={Link} to={item.path} className="h-full">
                <CardContent className="flex h-full flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Icon size={20} />
                    <Typography sx={{ fontWeight: 600 }} className="flex-1">
                      {item.label}
                    </Typography>
                    <ArrowRight size={16} />
                  </div>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          )
        })}
      </div>
    </Stack>
  )
}
