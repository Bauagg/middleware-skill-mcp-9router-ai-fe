import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material'
import { useIsAdmin } from '@/stores/authStore'
import { useAddMcpServer } from './api'

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/

export function AddMcpServerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isAdmin = useIsAdmin()
  const add = useAddMcpServer()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [keywords, setKeywords] = useState('')
  const [sharedLogin, setSharedLogin] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setUrl('')
      setKeywords('')
      setSharedLogin(false)
      add.reset()
    }
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const nameValid = NAME_RE.test(name)
  const urlValid = /^https?:\/\/\S+$/.test(url.trim())

  const submit = () =>
    add.mutate(
      {
        name,
        url: url.trim(),
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        shared_login: isAdmin && sharedLogin,
      },
      { onSuccess: onClose },
    )

  return (
    <Dialog open={open} onClose={add.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Tambah server MCP</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        <DialogContentText variant="body2">
          {isAdmin
            ? 'Server dari admin berlaku untuk semua user.'
            : 'Server ini pribadi: hanya kamu yang melihat dan memakai tool-nya.'}{' '}
          Backend memeriksa URL-nya dulu sebelum disimpan.
        </DialogContentText>
        <TextField
          label="Nama"
          placeholder="mis. notion"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          error={name !== '' && !nameValid}
          helperText="Huruf kecil, angka, - atau _, maks 40. Dipakai sebagai awalan nama tool."
          autoFocus
        />
        <TextField
          label="URL server MCP"
          placeholder="https://mcp.contoh.com/mcp"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={url !== '' && !urlValid}
          helperText="Alamat Streamable HTTP server MCP"
        />
        <TextField
          label="Kata kunci"
          placeholder="notion, catatan, dokumen"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          helperText="Dipisah koma. Tool server ini ditawarkan ke model bila pesan user menyebut salah satunya."
        />
        {isAdmin && (
          <>
            <FormControlLabel
              control={<Switch checked={sharedLogin} onChange={(e) => setSharedLogin(e.target.checked)} />}
              label="Login bersama (semua user memakai login admin)"
            />
            {sharedLogin && (
              <Alert severity="warning">
                Semua user akan memakai akun yang kamu hubungkan ke server ini. Matikan bila tiap user harus login
                dengan akunnya sendiri.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={add.isPending}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!nameValid || !urlValid || add.isPending}
          startIcon={add.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Tambah
        </Button>
      </DialogActions>
    </Dialog>
  )
}
