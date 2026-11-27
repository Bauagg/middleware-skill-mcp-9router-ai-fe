import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import { getErrorMessage } from '@/lib/axios'
import { useCreateAIProvider, useUpdateAIProvider, type AIDriver, type AIProvider } from './api'

interface Props {
  open: boolean
  drivers: AIDriver[]
  /** null = add a provider; otherwise edit this one */
  provider: AIProvider | null
  onClose: () => void
}

/** Admin: add a provider (e.g. an OpenAI-compatible API) or change one's name, addresses and model. */
export function ProviderDialog({ open, drivers, provider, onClose }: Props) {
  const create = useCreateAIProvider()
  const update = useUpdateAIProvider(true)
  // built-in drivers already have their provider; only the others can be added
  const addable = drivers.filter((d) => !d.builtin)
  const [driver, setDriver] = useState('')
  const [name, setName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [chatModel, setChatModel] = useState('')
  const [model, setModel] = useState('')
  const [loginURL, setLoginURL] = useState('')

  useEffect(() => {
    if (open) {
      setDriver(provider?.driver ?? addable[0]?.key ?? '')
      setName(provider?.name ?? '')
      setBaseURL(provider?.base_url ?? '')
      setChatModel(provider?.chat_model ?? '')
      setModel(provider?.image_model ?? '')
      setLoginURL(provider?.login_url ?? '')
      create.reset()
      update.reset()
    }
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const d = provider?.driver_info ?? drivers.find((x) => x.key === driver)
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error
  const valid =
    !!d &&
    name.trim() !== '' &&
    (!d.needs_base_url || /^https?:\/\/\S+$/.test(baseURL.trim())) &&
    (!d.model_fields || chatModel.trim() !== '' || model.trim() !== '')

  const submit = () => {
    const body = {
      name: name.trim(),
      ...(d?.needs_base_url ? { base_url: baseURL.trim() } : {}),
      ...(d?.model_fields ? { chat_model: chatModel.trim(), image_model: model.trim() } : {}),
      ...(d?.auth === 'browser' ? { login_url: loginURL.trim() } : {}),
    }
    if (provider) update.mutate({ id: provider.id, ...body }, { onSuccess: onClose })
    else create.mutate({ driver, ...body }, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{provider ? `Ubah provider: ${provider.name}` : 'Tambah provider AI'}</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        {!provider && (
          <TextField
            select
            label="Jenis layanan"
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            sx={{ mt: 1 }}
          >
            {addable.map((x) => (
              <MenuItem key={x.key} value={x.key}>
                {x.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        {d && (
          <Alert severity="info" icon={false} sx={{ mt: provider ? 1 : 0 }}>
            {d.description}
          </Alert>
        )}
        <TextField
          label="Nama provider"
          placeholder="mis. Grok (xAI)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="Tampil ke user di halaman Akun AI."
        />
        {d?.needs_base_url && (
          <TextField
            label="Alamat API"
            placeholder="https://api.x.ai/v1"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            helperText="Alamat dasar API berformat OpenAI (tanpa /images/generations)."
            slotProps={{ htmlInput: { spellCheck: false } }}
          />
        )}
        {d?.model_fields && (
          <>
            <TextField
              label="Model chat"
              placeholder="mis. grok-3, gpt-4o-mini, llama-3.3-70b-versatile"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              helperText="Menjawab chat saat 9Router user habis/error. Kosongkan bila tidak dipakai untuk chat."
              slotProps={{ htmlInput: { spellCheck: false } }}
            />
            <TextField
              label="Model gambar"
              placeholder="mis. grok-2-image, gpt-image-1, dall-e-3"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              helperText="Kosongkan bila tidak dipakai untuk gambar. Isi minimal salah satu model."
              slotProps={{ htmlInput: { spellCheck: false } }}
            />
          </>
        )}
        {d?.auth === 'browser' && (
          <TextField
            label="Halaman login (opsional)"
            placeholder={d.login_url}
            value={loginURL}
            onChange={(e) => setLoginURL(e.target.value)}
            helperText="Kosongkan untuk memakai halaman login bawaan."
            slotProps={{ htmlInput: { spellCheck: false } }}
          />
        )}

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
          {provider ? 'Simpan' : 'Tambah'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
