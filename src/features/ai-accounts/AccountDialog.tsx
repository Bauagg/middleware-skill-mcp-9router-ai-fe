import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { ExternalLink, Eye, EyeOff } from 'lucide-react'
import { getErrorMessage } from '@/lib/axios'
import {
  hasSessionCookie,
  isGeminiAPI,
  sessionCookieLabel,
  useCreateAIAccount,
  useUpdateAIAccount,
  type AIAccount,
  type AIProvider,
} from './api'

interface Props {
  open: boolean
  provider: AIProvider | null
  /** null = add a new account; otherwise replace this account's cookies / API key */
  account: AIAccount | null
  onClose: () => void
}

/** Where Google AI Studio issues Gemini API keys. */
const AI_STUDIO_KEY_URL = 'https://aistudio.google.com/apikey'

/** One numbered step of the how-to, readable at phone width. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  const theme = useTheme()
  return (
    <li className="flex gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
        style={{ background: theme.palette.primary.main, color: theme.palette.primary.contrastText }}
      >
        {n}
      </span>
      <Typography variant="body1" component="div" sx={{ pt: '2px', lineHeight: 1.6 }}>
        {children}
      </Typography>
    </li>
  )
}

/**
 * Add an account by pasting an API key or cookies, or replace them for one that needs to sign in again.
 * Fullscreen on phones; the account name is filled in, so a new user only has to paste the key.
 */
export function AccountDialog({ open, provider, account, onClose }: Props) {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('sm'))
  const create = useCreateAIAccount()
  const update = useUpdateAIAccount(true)
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [reveal, setReveal] = useState(false)

  useEffect(() => {
    if (open) {
      setName(account?.name ?? provider?.name ?? '')
      setSecret('')
      setReveal(false)
      create.reset()
      update.reset()
    }
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!provider) return null
  const d = provider.driver_info
  const apiKey = d.auth === 'api_key'
  const gemini = apiKey && isGeminiAPI(provider)
  const site = d.cookie_domains?.[0] ?? provider.name
  const cookieMissing = !apiKey && secret !== '' && !hasSessionCookie(d, secret)

  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error
  const valid = name.trim() !== '' && secret.trim() !== '' && !cookieMissing

  const submit = () => {
    const body = apiKey ? { api_key: secret.trim() } : { cookies: secret }
    if (account) {
      update.mutate({ id: account.id, name: name.trim(), ...body }, { onSuccess: onClose })
    } else {
      create.mutate({ provider_id: provider.id, name: name.trim(), ...body }, { onSuccess: onClose })
    }
  }

  const title = account
    ? `${apiKey ? 'Ganti API key' : 'Perbarui cookie'}: ${account.name}`
    : apiKey
      ? `Hubungkan ${provider.name}`
      : `Tambah akun ${provider.name}`

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={phone}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20, pb: 1 }}>{title}</DialogTitle>
      <DialogContent className="flex flex-col gap-5">
        {/* how-to: plain steps, normal-size text */}
        <div className="rounded-xl border p-4" style={{ borderColor: theme.palette.divider }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            {apiKey ? 'Cara mendapatkan API key' : 'Cara mengambil cookie'}
          </Typography>
          {gemini ? (
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Buka <b>Google AI Studio</b> dan login dengan akun Google-mu.
              </Step>
              <Step n={2}>
                Klik <b>Create API key</b>, lalu salin key yang muncul.
              </Step>
              <Step n={3}>Tempel key-nya di kolom di bawah, lalu tekan <b>Hubungkan</b>.</Step>
            </ol>
          ) : apiKey ? (
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Buka dashboard <b>{provider.name}</b> dan buat API key.
              </Step>
              <Step n={2}>Tempel key-nya di kolom di bawah, lalu tekan <b>Hubungkan</b>.</Step>
            </ol>
          ) : (
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                Buka <b>jendela Incognito/Private</b>, login ke <b>{site}</b> dengan akun yang mau dipakai.
              </Step>
              <Step n={2}>
                Tekan <b>F12</b> → tab <b>Network</b> → muat ulang halaman → klik request pertama.
              </Step>
              <Step n={3}>
                Di <b>Request Headers</b>, salin seluruh nilai <code>cookie</code>, lalu tempel di bawah.
              </Step>
              <Step n={4}>
                Tutup jendela Incognito <b>tanpa logout</b> (logout membuat cookie langsung tidak berlaku).
              </Step>
            </ol>
          )}
          {gemini && (
            <Button
              href={AI_STUDIO_KEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="large"
              endIcon={<ExternalLink size={16} />}
              fullWidth={phone}
              sx={{ mt: 2 }}
            >
              Buka Google AI Studio
            </Button>
          )}
        </div>

        <TextField
          label={apiKey ? 'API key' : `Cookie ${site}`}
          placeholder={gemini ? 'AIza...' : apiKey ? 'sk-...' : `${sessionCookieLabel(d)}=...; ...`}
          type={apiKey && !reveal ? 'password' : 'text'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          multiline={!apiKey}
          minRows={apiKey ? undefined : 4}
          maxRows={apiKey ? undefined : 8}
          autoFocus
          fullWidth
          error={cookieMissing}
          helperText={
            cookieMissing
              ? `Cookie ${sessionCookieLabel(d)} tidak ada: salin semua cookie saat sudah login.`
              : `Disimpan terenkripsi dan tidak pernah ditampilkan lagi. Jangan bagikan ke orang lain.`
          }
          slotProps={{
            inputLabel: { sx: { fontSize: 16 } },
            formHelperText: { sx: { fontSize: 13, mx: 0.5 } },
            htmlInput: {
              spellCheck: false,
              autoComplete: 'off',
              autoCapitalize: 'off',
              style: { fontSize: 16, fontFamily: apiKey ? undefined : 'ui-monospace, monospace' },
            },
            input: apiKey
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setReveal((v) => !v)}
                        edge="end"
                        aria-label={reveal ? 'Sembunyikan API key' : 'Tampilkan API key'}
                      >
                        {reveal ? <EyeOff size={20} /> : <Eye size={20} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              : undefined,
          }}
        />

        <TextField
          label="Nama akun"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          helperText="Hanya untuk membedakan akun di halaman ini."
          slotProps={{
            inputLabel: { sx: { fontSize: 16 } },
            formHelperText: { sx: { fontSize: 13, mx: 0.5 } },
            htmlInput: { style: { fontSize: 16 } },
          }}
        />

        {apiKey && (provider.chat_model || provider.image_model) && (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {provider.image_model && (
              <>
                Gambar memakai model <code>{provider.image_model}</code>.{' '}
              </>
            )}
            {provider.chat_model && (
              <>
                Chat (saat 9Router-mu habis) memakai <code>{provider.chat_model}</code>.{' '}
              </>
            )}
            Biayanya mengikuti kuota/tagihan API akunmu.
          </Typography>
        )}

        {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}
      </DialogContent>
      <DialogActions
        sx={{ px: 3, pb: 3, pt: 1, gap: 1, flexDirection: phone ? 'column-reverse' : 'row', alignItems: 'stretch' }}
      >
        <Button onClick={onClose} color="inherit" size="large" disabled={pending} fullWidth={phone}>
          Batal
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={submit}
          disabled={!valid || pending}
          fullWidth={phone}
          startIcon={pending ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ minWidth: 160 }}
        >
          {pending ? 'Mengecek…' : account ? 'Simpan & cek' : apiKey ? 'Hubungkan' : 'Tambah & cek'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
