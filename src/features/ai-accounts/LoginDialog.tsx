import { useEffect, useRef, useState } from 'react'
import RFB from '@novnc/novnc'
import { useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import { CircleCheck } from 'lucide-react'
import { getErrorMessage } from '@/lib/axios'
import { notify } from '@/lib/notify'
import { aiKeys, cancelLogin, useLoginState, useStartLogin, vncUrl, type AIAccount, type AIProvider } from './api'

interface Props {
  open: boolean
  provider: AIProvider | null
  /** null = new account; otherwise sign this account in again */
  account: AIAccount | null
  onClose: () => void
  /** fall back to pasting cookies (e.g. the sign-in browser isn't running) */
  onPasteCookies: () => void
}

type Screen = 'connecting' | 'connected' | 'disconnected'

/** how long the "saved" message stays before the dialog closes itself */
const CLOSE_AFTER_SAVE_MS = 1500

/**
 * Sign-in to the provider in a browser running on the server, shown here over noVNC. The server
 * watches the window: as soon as the sign-in completes it saves the account, closes the window
 * (a throwaway context, like Incognito) and this dialog closes itself. Nothing to click after
 * signing in, and no need to open the provider's own page.
 */
export function LoginDialog({ open, provider, account, onClose, onPasteCookies }: Props) {
  const qc = useQueryClient()
  const start = useStartLogin()
  const login = start.data
  const status = useLoginState(open ? login?.id : undefined)
  const state = status.data?.state ?? login?.state ?? 'waiting'
  const [screen, setScreen] = useState<Screen>('connecting')
  const screenRef = useRef<HTMLDivElement>(null)
  // StrictMode runs effects twice: start one sign-in per opening, not two
  const startedRef = useRef(false)

  useEffect(() => {
    if (!open) {
      startedRef.current = false
      return
    }
    if (startedRef.current || !provider) return
    startedRef.current = true
    setScreen('connecting')
    start.mutate(account ? { account_id: account.id } : { provider_id: provider.id })
    // start once per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // attach the remote screen once the server has opened the sign-in window
  useEffect(() => {
    if (!open || !login || !screenRef.current) return
    const rfb = new RFB(screenRef.current, vncUrl(login.vnc_path), { wsProtocols: ['binary'] })
    rfb.scaleViewport = true
    rfb.background = 'transparent'
    const onConnect = () => setScreen('connected')
    const onDisconnect = () => setScreen('disconnected')
    rfb.addEventListener('connect', onConnect)
    rfb.addEventListener('disconnect', onDisconnect)
    return () => {
      rfb.removeEventListener('connect', onConnect)
      rfb.removeEventListener('disconnect', onDisconnect)
      rfb.disconnect()
    }
  }, [open, login])

  // saved by the server: refresh the list, say so, and close
  const saved = state === 'saved' ? status.data?.account : undefined
  useEffect(() => {
    if (!saved) return
    void qc.invalidateQueries({ queryKey: aiKeys.all })
    notify.success(`Akun ${saved.name} tersimpan`)
    const t = setTimeout(() => {
      start.reset()
      onClose()
    }, CLOSE_AFTER_SAVE_MS)
    return () => clearTimeout(t)
    // once per saved account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.id])

  const close = () => {
    // a sign-in already being saved is left to finish on the server
    if (login && state === 'waiting') cancelLogin(login.id)
    start.reset()
    onClose()
  }

  const retry = () => {
    if (!provider) return
    start.reset()
    setScreen('connecting')
    start.mutate(account ? { account_id: account.id } : { provider_id: provider.id })
  }

  const overlay =
    state === 'saving' ? (
      <>
        <CircularProgress size={28} color="inherit" />
        <Typography variant="body2">Login terdeteksi — menyimpan dan mengecek sesi…</Typography>
      </>
    ) : state === 'saved' ? (
      <>
        <CircleCheck size={32} />
        <Typography variant="body2">Akun {saved?.name} tersimpan. Menutup…</Typography>
      </>
    ) : screen === 'connecting' ? (
      <>
        <CircularProgress size={28} color="inherit" />
        <Typography variant="body2">Membuka browser login…</Typography>
      </>
    ) : screen === 'disconnected' && state === 'waiting' ? (
      <Typography variant="body2">Layar terputus. Tutup lalu mulai login lagi.</Typography>
    ) : null

  return (
    <Dialog open={open} onClose={state === 'saving' ? undefined : close} maxWidth="lg" fullWidth>
      <DialogTitle>{account ? `Login ulang: ${account.name}` : `Login akun ${provider?.name ?? ''}`}</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        {start.isError ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  close()
                  onPasteCookies()
                }}
              >
                Tempel cookie
              </Button>
            }
          >
            {getErrorMessage(start.error)}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Login di layar bawah ini. Begitu login berhasil, akun <b>tersimpan otomatis</b> dan jendela ini menutup sendiri
              — tidak perlu membuka halaman {provider?.name} atau mengklik apa pun. Jendelanya seperti Incognito: setelah
              tersimpan, browser melupakan sesinya dan hanya middleware yang memakainya.
            </Typography>
            <Box
              className="relative w-full overflow-hidden rounded"
              sx={{ aspectRatio: '1280 / 900', bgcolor: 'common.black' }}
            >
              <div ref={screenRef} className="h-full w-full" />
              {overlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                  {overlay}
                </div>
              )}
            </Box>
            {state === 'failed' && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={retry}>
                    Coba lagi
                  </Button>
                }
              >
                {status.data?.error || 'Gagal menyimpan akun'}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} color="inherit" disabled={state === 'saving'}>
          {state === 'waiting' ? 'Batal' : 'Tutup'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
