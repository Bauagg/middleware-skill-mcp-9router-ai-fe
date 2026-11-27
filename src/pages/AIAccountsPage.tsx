import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ArrowDown,
  ArrowUp,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clapperboard,
  Clock,
  ImageIcon,
  MessageSquare,
  KeyRound,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { OwnerChip } from '@/components/common/OwnerChip'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import { AccountDialog } from '@/features/ai-accounts/AccountDialog'
import {
  activeCooldown,
  useAIAccounts,
  useAIDrivers,
  useAIProviders,
  useCheckAIAccount,
  useDeleteAIAccount,
  useDeleteAIProvider,
  useReorder,
  useResetAICooldown,
  useUpdateAIAccount,
  useUpdateAIProvider,
  type AIAccount,
  type AIAccountStatus,
  type AIDriver,
  type AIProvider,
} from '@/features/ai-accounts/api'
import { LoginDialog } from '@/features/ai-accounts/LoginDialog'
import { ProviderDialog } from '@/features/ai-accounts/ProviderDialog'
import { formatDateTime, formatNumber } from '@/lib/format'
import { useIsAdmin } from '@/stores/authStore'

const statusMeta: Record<
  AIAccountStatus,
  { label: string; color: 'default' | 'success' | 'warning' | 'error'; icon: LucideIcon }
> = {
  ok: { label: 'Aktif', color: 'success', icon: CircleCheck },
  needs_login: { label: 'Perlu login ulang', color: 'warning', icon: KeyRound },
  error: { label: 'Error', color: 'error', icon: CircleX },
  unchecked: { label: 'Belum dicek', color: 'default', icon: CircleDashed },
}

type Target = { provider: AIProvider; account: AIAccount | null }

/** Swap two items of an ordered list and return the priority changes. */
function swap<T extends { id: string; priority: number }>(list: T[], index: number, dir: -1 | 1) {
  const next = [...list]
  ;[next[index], next[index + dir]] = [next[index + dir], next[index]]
  return next.map((x, i) => ({ id: x.id, priority: i })).filter((c) => list.find((x) => x.id === c.id)?.priority !== c.priority)
}

export function AIAccountsPage() {
  const isAdmin = useIsAdmin()
  const providers = useAIProviders()
  const accounts = useAIAccounts()
  const [tab, setTab] = useState<'accounts' | 'providers'>('accounts')

  const refetch = () => {
    void providers.refetch()
    void accounts.refetch()
  }
  const fetching = providers.isFetching || accounts.isFetching

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description={
          isAdmin
            ? 'Akun AI milik semua user dan provider yang bisa mereka hubungkan. Gambar dan video setiap user hanya memakai akun miliknya sendiri.'
            : 'Hubungkan akun AI-mu (mis. Gemini, ChatGPT): gambar dan video yang kamu minta di chat memakai kuota akun ini. Akunmu tidak dipakai user lain.'
        }
        actions={
          <Button variant="outlined" color="inherit" startIcon={<RefreshCw size={16} />} onClick={refetch} disabled={fetching}>
            Muat ulang
          </Button>
        }
      />

      {isAdmin && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="accounts" label="Akun" />
          <Tab value="providers" label="Provider" />
        </Tabs>
      )}

      {tab === 'providers' && isAdmin ? (
        <ProvidersTab providers={providers} />
      ) : (
        <AccountsTab providers={providers} accounts={accounts} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// accounts, grouped by provider
// ---------------------------------------------------------------------------

function AccountsTab({
  providers,
  accounts,
}: {
  providers: ReturnType<typeof useAIProviders>
  accounts: ReturnType<typeof useAIAccounts>
}) {
  const reorder = useReorder('accounts')
  const remove = useDeleteAIAccount()
  const [secret, setSecret] = useState<Target | null>(null) // paste cookies / API key
  const [login, setLogin] = useState<Target | null>(null) // sign-in in the server browser
  const [secretOpen, setSecretOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [removing, setRemoving] = useState<AIAccount | null>(null)

  if (providers.isPending || accounts.isPending) return <LoadingState />
  if (providers.isError) return <ErrorState error={providers.error} onRetry={() => providers.refetch()} />
  if (accounts.isError) return <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />

  const openSecret = (t: Target) => {
    setSecret(t)
    setSecretOpen(true)
  }
  const openLogin = (t: Target) => {
    setLogin(t)
    setLoginOpen(true)
  }
  const known = new Set(providers.data.map((p) => p.id))
  // accounts of a provider the admin switched off: still listed so they can be removed
  const orphans = accounts.data.filter((a) => !known.has(a.provider_id))

  return (
    <>
      <Alert severity="info" icon={<Sparkles size={20} />}>
        <b>Chat:</b> bila 9Router-mu habis kuota atau error, chat dijawab akunmu yang mendukung chat. <b>Gambar:</b> akunmu
        dicoba lebih dulu (urut provider, lalu akun dari atas); bila semua limitnya habis, model gambar 9Router-mu jadi
        cadangan. <b>Video:</b> minta di chat, mis. &quot;buatkan video kucing main bola&quot; (butuh akun
        yang mendukung video). Cukup login sekali: sesi dijaga tetap hidup otomatis sampai akunnya kamu hapus.
      </Alert>

      {(accounts.isFetching || reorder.isPending) && <LinearProgress />}

      {providers.data.length === 0 && (
        <EmptyState icon={ShieldCheck} title="Belum ada provider AI" description="Admin belum menyalakan provider apa pun." />
      )}

      {providers.data.map((p) => {
        const list = accounts.data.filter((a) => a.provider_id === p.id)
        return (
          <ProviderSection
            key={p.id}
            provider={p}
            onLogin={() => openLogin({ provider: p, account: null })}
            onPaste={() => openSecret({ provider: p, account: null })}
          >
            {list.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Belum ada akun {p.name}.
              </Typography>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {list.map((a) => {
                  // order is per owner: an admin sees several users' accounts here
                  const mine = list.filter((x) => x.user_id === a.user_id)
                  const j = mine.indexOf(a)
                  return (
                    <AccountCard
                      key={a.id}
                      account={a}
                      provider={p}
                      first={j === 0}
                      last={j === mine.length - 1}
                      busy={reorder.isPending}
                      onMove={(dir) => reorder.mutate(swap(mine, j, dir))}
                      onSecret={() => openSecret({ provider: p, account: a })}
                      onLogin={() => openLogin({ provider: p, account: a })}
                      onDelete={() => setRemoving(a)}
                    />
                  )
                })}
              </div>
            )}
          </ProviderSection>
        )
      })}

      {orphans.length > 0 && (
        <Paper variant="outlined" className="flex flex-col gap-3 p-4">
          <Typography sx={{ fontWeight: 600 }}>Provider dimatikan admin</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Akun ini tidak dipakai selama providernya dimatikan.
          </Typography>
          {orphans.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <Typography className="flex-1 break-all">{a.name}</Typography>
              <Button size="small" color="error" startIcon={<Trash2 size={14} />} onClick={() => setRemoving(a)}>
                Hapus
              </Button>
            </div>
          ))}
        </Paper>
      )}

      <LoginDialog
        open={loginOpen}
        provider={login?.provider ?? null}
        account={login?.account ?? null}
        onClose={() => setLoginOpen(false)}
        onPasteCookies={() => login && openSecret(login)}
      />
      <AccountDialog
        open={secretOpen}
        provider={secret?.provider ?? null}
        account={secret?.account ?? null}
        onClose={() => setSecretOpen(false)}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Hapus akun?"
        description={`Akun "${removing?.name}" dan sesinya dihapus dari middleware. Akun aslinya di provider tidak terpengaruh.`}
        confirmLabel="Hapus"
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}

function Capabilities({ driver }: { driver: AIDriver }) {
  return (
    <>
      {driver.text && <Chip size="small" variant="outlined" icon={<MessageSquare size={14} />} label="Chat" />}
      {driver.image && <Chip size="small" variant="outlined" icon={<ImageIcon size={14} />} label="Gambar" />}
      {driver.video && <Chip size="small" variant="outlined" icon={<Clapperboard size={14} />} label="Video" />}
      <Chip size="small" variant="outlined" label={driver.auth === 'api_key' ? 'API key' : 'Login browser'} />
    </>
  )
}

function ProviderSection({
  provider: p,
  onLogin,
  onPaste,
  children,
}: {
  provider: AIProvider
  onLogin: () => void
  onPaste: () => void
  children: React.ReactNode
}) {
  const d = p.driver_info
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
          {p.name}
        </Typography>
        <Capabilities driver={d} />
        <div className="ml-auto flex flex-wrap gap-2">
          {d.auth === 'browser' ? (
            <>
              <Button size="small" variant="outlined" startIcon={<KeyRound size={14} />} onClick={onPaste}>
                Tempel cookie
              </Button>
              <Button size="small" variant="contained" startIcon={<LogIn size={14} />} onClick={onLogin}>
                Login akun {p.name}
              </Button>
            </>
          ) : (
            <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={onPaste}>
              Tambah API key
            </Button>
          )}
        </div>
      </div>
      {d.note && (
        <Alert severity="warning" sx={{ py: 0 }}>
          {d.note}
        </Alert>
      )}
      {children}
    </section>
  )
}

interface CardProps {
  account: AIAccount
  provider: AIProvider
  first: boolean
  last: boolean
  busy: boolean
  onMove: (dir: -1 | 1) => void
  onSecret: () => void
  onLogin: () => void
  onDelete: () => void
}

function AccountCard({ account: a, provider: p, first, last, busy, onMove, onSecret, onLogin, onDelete }: CardProps) {
  const check = useCheckAIAccount()
  const update = useUpdateAIAccount()
  const reset = useResetAICooldown()
  const meta = statusMeta[a.status] ?? statusMeta.error
  const Icon = meta.icon
  const chatCd = activeCooldown(a.chat_cooldown_until)
  const imageCd = activeCooldown(a.image_cooldown_until)
  const videoCd = activeCooldown(a.video_cooldown_until)
  const checking = check.isPending
  const browser = p.driver_info.auth === 'browser'

  return (
    <Paper variant="outlined" className="flex flex-col gap-3 p-4" sx={{ opacity: a.enabled ? 1 : 0.65 }}>
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <Tooltip title="Coba lebih dulu">
            <span>
              <IconButton size="small" disabled={first || busy} onClick={() => onMove(-1)} aria-label="Naikkan prioritas">
                <ArrowUp size={16} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Coba belakangan">
            <span>
              <IconButton size="small" disabled={last || busy} onClick={() => onMove(1)} aria-label="Turunkan prioritas">
                <ArrowDown size={16} />
              </IconButton>
            </span>
          </Tooltip>
        </div>
        <div className="min-w-0 flex-1">
          <Typography sx={{ fontWeight: 600, fontSize: 17 }} className="break-all">
            {a.name}
          </Typography>
          <div className="flex flex-wrap items-center gap-1.5">
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {browser ? `${a.cookie_count} cookie` : 'API key'} · ditambahkan {formatDateTime(a.created_at)}
            </Typography>
            <OwnerChip userId={a.user_id} />
          </div>
        </div>
        <Chip size="small" color={meta.color} icon={<Icon size={14} />} label={meta.label} />
        <Tooltip title={a.enabled ? 'Matikan (tidak dipakai)' : 'Nyalakan'}>
          <Switch
            size="small"
            checked={a.enabled}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ id: a.id, enabled: e.target.checked })}
            slotProps={{ input: { 'aria-label': 'Akun dipakai' } }}
          />
        </Tooltip>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {p.driver_info.text && <Stat label="Chat dijawab" value={formatNumber(a.chats)} />}
        <Stat label="Gambar dibuat" value={formatNumber(a.images)} />
        {p.driver_info.video && <Stat label="Video dibuat" value={formatNumber(a.videos)} />}
        <Stat label="Terakhir dipakai" value={formatDateTime(a.last_used_at)} />
        <Stat label="Terakhir dicek" value={formatDateTime(a.last_checked_at)} />
        {browser && <Stat label="Sesi diperbarui" value={formatDateTime(a.cookies_updated_at)} />}
      </div>

      {(chatCd || imageCd || videoCd) && (
        <Alert
          severity="warning"
          icon={<Clock size={18} />}
          action={
            <Button size="small" color="inherit" disabled={reset.isPending} onClick={() => reset.mutate(a.id)}>
              Pakai lagi
            </Button>
          }
        >
          Limit habis, akun dilewati
          {chatCd && <> · chat sampai {formatDateTime(chatCd.toISOString())}</>}
          {imageCd && <> · gambar sampai {formatDateTime(imageCd.toISOString())}</>}
          {videoCd && <> · video sampai {formatDateTime(videoCd.toISOString())}</>}
        </Alert>
      )}

      {a.status === 'needs_login' && (
        <Alert severity="warning">
          {browser
            ? `${p.name} menolak sesi ini. Middleware mencoba memulihkannya sendiri tiap 10 menit; bila tetap begini, akunnya logout (mis. logout di browser atau ganti password): klik Login ulang.`
            : 'API key ditolak: klik Ganti API key.'}
        </Alert>
      )}
      {a.last_error && a.status !== 'needs_login' && (
        <Typography variant="body2" color="error" className="break-words">
          {a.last_error}
        </Typography>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshCw size={14} className={checking ? 'animate-spin' : undefined} />}
          disabled={checking}
          onClick={() => check.mutate(a.id)}
        >
          {checking ? 'Mengecek…' : 'Cek sesi'}
        </Button>
        {browser && (
          <Button
            size="small"
            variant={a.status === 'needs_login' ? 'contained' : 'outlined'}
            startIcon={<LogIn size={14} />}
            onClick={onLogin}
          >
            Login ulang
          </Button>
        )}
        <Button
          size="small"
          color={browser ? 'inherit' : 'primary'}
          variant={!browser && a.status === 'needs_login' ? 'contained' : 'text'}
          startIcon={<KeyRound size={14} />}
          onClick={onSecret}
        >
          {browser ? 'Tempel cookie' : 'Ganti API key'}
        </Button>
        <Button size="small" color="error" startIcon={<Trash2 size={14} />} onClick={onDelete} sx={{ ml: 'auto' }}>
          Hapus
        </Button>
      </div>
    </Paper>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" className="truncate">
        {value}
      </Typography>
    </div>
  )
}

// ---------------------------------------------------------------------------
// providers (admin)
// ---------------------------------------------------------------------------

function ProvidersTab({ providers }: { providers: ReturnType<typeof useAIProviders> }) {
  const drivers = useAIDrivers()
  const reorder = useReorder('providers')
  const update = useUpdateAIProvider()
  const remove = useDeleteAIProvider()
  const [editing, setEditing] = useState<AIProvider | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removing, setRemoving] = useState<AIProvider | null>(null)

  if (providers.isPending || drivers.isPending) return <LoadingState />
  if (providers.isError) return <ErrorState error={providers.error} onRetry={() => providers.refetch()} />
  if (drivers.isError) return <ErrorState error={drivers.error} onRetry={() => drivers.refetch()} />

  const list = providers.data
  const edit = (p: AIProvider | null) => {
    setEditing(p)
    setDialogOpen(true)
  }

  return (
    <>
      <div className="flex flex-wrap items-start gap-3">
        <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 260 }}>
          Provider yang bisa dihubungkan user, urut dari yang dicoba lebih dulu. Provider bawaan (login browser) hanya bisa
          dimatikan; provider <b>API kompatibel OpenAI</b> bisa ditambah tanpa koding: isi alamat API serta model chat
          dan/atau gambar, lalu user menempel API key-nya.
        </Typography>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => edit(null)}>
          Tambah provider
        </Button>
      </div>

      {reorder.isPending && <LinearProgress />}

      <div className="flex flex-col gap-3">
        {list.map((p, i) => (
          <Paper key={p.id} variant="outlined" className="flex flex-wrap items-center gap-3 p-3" sx={{ opacity: p.enabled ? 1 : 0.65 }}>
            <div className="flex flex-col">
              <IconButton
                size="small"
                disabled={i === 0 || reorder.isPending}
                onClick={() => reorder.mutate(swap(list, i, -1))}
                aria-label="Naikkan prioritas"
              >
                <ArrowUp size={16} />
              </IconButton>
              <IconButton
                size="small"
                disabled={i === list.length - 1 || reorder.isPending}
                onClick={() => reorder.mutate(swap(list, i, 1))}
                aria-label="Turunkan prioritas"
              >
                <ArrowDown size={16} />
              </IconButton>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography>
                <Capabilities driver={p.driver_info} />
                {p.driver_info.builtin && <Chip size="small" label="Bawaan" />}
              </div>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} className="break-all">
                {p.driver_info.name}
                {p.base_url && <> · {p.base_url}</>}
                {p.chat_model && <> · chat {p.chat_model}</>}
                {p.image_model && <> · gambar {p.image_model}</>}
                {p.login_url && <> · login {p.login_url}</>}
              </Typography>
            </div>
            <Tooltip title={p.enabled ? 'Matikan (user tidak bisa memakai provider ini)' : 'Nyalakan'}>
              <Switch
                size="small"
                checked={p.enabled}
                disabled={update.isPending}
                onChange={(e) => update.mutate({ id: p.id, enabled: e.target.checked })}
                slotProps={{ input: { 'aria-label': 'Provider aktif' } }}
              />
            </Tooltip>
            <Button size="small" startIcon={<Pencil size={14} />} onClick={() => edit(p)}>
              Ubah
            </Button>
            {!p.driver_info.builtin && (
              <Button size="small" color="error" startIcon={<Trash2 size={14} />} onClick={() => setRemoving(p)}>
                Hapus
              </Button>
            )}
          </Paper>
        ))}
      </div>

      <ProviderDialog open={dialogOpen} drivers={drivers.data} provider={editing} onClose={() => setDialogOpen(false)} />
      <ConfirmDialog
        open={removing !== null}
        title="Hapus provider?"
        description={`Provider "${removing?.name}" dan akun semua user di dalamnya dihapus dari middleware.`}
        confirmLabel="Hapus"
        destructive
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}
