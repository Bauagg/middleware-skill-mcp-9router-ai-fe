import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { getErrorMessage } from '@/lib/axios'
import {
  hasSessionCookie,
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

/** Add an account by pasting cookies or an API key, or replace them for one that needs to sign in again. */
export function AccountDialog({ open, provider, account, onClose }: Props) {
  const create = useCreateAIAccount()
  const update = useUpdateAIAccount(true)
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')

  useEffect(() => {
    if (open) {
      setName(account?.name ?? '')
      setSecret('')
      create.reset()
      update.reset()
    }
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!provider) return null
  const d = provider.driver_info
  const apiKey = d.auth === 'api_key'
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

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {account
          ? `${apiKey ? 'Ganti API key' : 'Perbarui cookie'}: ${account.name}`
          : `Tambah akun ${provider.name}`}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        {apiKey ? (
          <Alert severity="info" icon={false}>
            Tempel API key dari dashboard layanan <b>{provider.name}</b> ({provider.base_url}).
            {provider.chat_model && (
              <>
                {' '}Chat (saat 9Router habis) memakai model <code>{provider.chat_model}</code>.
              </>
            )}
            {provider.image_model && (
              <>
                {' '}Gambar memakai model <code>{provider.image_model}</code>.
              </>
            )}{' '}
            Biayanya mengikuti pemakaian API akunmu.
          </Alert>
        ) : (
          <Alert severity="info" icon={false}>
            <Typography variant="subtitle2" gutterBottom>
              Cara mengambil cookie
            </Typography>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>
                Buka <b>jendela Incognito/Private</b>, login ke <b>{site}</b> dengan akun yang mau dipakai.
              </li>
              <li>
                Tekan <b>F12</b> → tab <b>Network</b> → muat ulang halaman → klik request pertama.
              </li>
              <li>
                Di bagian <b>Request Headers</b>, salin seluruh nilai <code>cookie</code>, lalu tempel di bawah.
              </li>
              <li>
                Tutup jendela Incognito <b>tanpa logout</b>. Logout membuat cookie ini langsung tidak berlaku.
              </li>
            </ol>
            <Typography variant="caption" component="p" sx={{ mt: 1 }}>
              Bisa juga ekspor JSON dari ekstensi seperti Cookie-Editor, atau isi file cookies.txt.
            </Typography>
          </Alert>
        )}

        <TextField
          label="Nama akun"
          placeholder={`mis. ${d.key}-utama`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="Hanya untuk membedakan akun di halaman ini."
          autoFocus={!account}
        />
        <TextField
          label={apiKey ? 'API key' : `Cookie ${site}`}
          placeholder={apiKey ? 'sk-...' : `${sessionCookieLabel(d)}=...; ...`}
          type={apiKey ? 'password' : 'text'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          multiline={!apiKey}
          minRows={apiKey ? undefined : 4}
          maxRows={apiKey ? undefined : 10}
          autoFocus={!!account}
          error={cookieMissing}
          helperText={
            cookieMissing
              ? `Cookie ${sessionCookieLabel(d)} tidak ada: salin semua cookie saat sudah login.`
              : `Disimpan terenkripsi dan tidak pernah ditampilkan lagi. ${apiKey ? 'API key' : 'Cookie'} ini setara akses ke akunmu, jangan dibagikan.`
          }
          slotProps={{ htmlInput: { spellCheck: false, autoComplete: 'off', className: 'font-mono text-xs' } }}
        />

        {error && <Alert severity="error">{getErrorMessage(error)}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={pending}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!valid || pending}
          startIcon={pending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {pending ? 'Mengecek…' : account ? 'Simpan & cek' : 'Tambah & cek'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
