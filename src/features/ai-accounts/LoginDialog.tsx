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
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { CircleCheck, KeyRound, MonitorX } from 'lucide-react'
import { getErrorMessage } from '@/lib/axios'
import { notify } from '@/lib/notify'
import { useIsAdmin } from '@/stores/authStore'
import {
  aiKeys,
  cancelLogin,
  isLoginBrowserDown,
  useLoginState,
  useStartLogin,
  vncUrl,
  type AIAccount,
  type AIProvider,
} from './api'

interface Props {
  open: boolean
  provider: AIProvider | null
  /** null = new account; otherwise sign this account in again */
  account: AIAccount | null
  onClose: () => void
  /** fall back to pasting cookies (e.g. the sign-in browser isn't running); admins only, undefined hides it */
  onPasteCookies?: () => void
}

type Screen = 'connecting' | 'connected' | 'disconnected'

/** how long the "saved" message stays before the dialog closes itself */
const CLOSE_AFTER_SAVE_MS = 1500

/**
 * Size of the sign-in browser's screen. Portrait and phone-sized on purpose: sign-in pages are
 * responsive, so they show their mobile layout (one column, big email/password fields). Must match
 * LOGIN_SCREEN_W/H in the backend's docker/login-browser/entrypoint.sh.
 */
const LOGIN_SCREEN = { width: 540, height: 960 }

/**
 * Sign-in to the provider in a browser running on the server, shown here over noVNC. The server
 * watches the window: as soon as the sign-in completes it saves the account, closes the window
 * (a throwaway context, like Incognito) and this dialog closes itself. Nothing to click after
 * signing in, and no need to open the provider's own page.
 */
export function LoginDialog({ open, provider, account, onClose, onPasteCookies }: Props) {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('sm'))
  const isAdmin = useIsAdmin()
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

  const errorMessage = start.isError ? getErrorMessage(start.error) : ''
  const browserDown = start.isError && isLoginBrowserDown(errorMessage)
  const pasteInstead = onPasteCookies
    ? () => {
        close()
        onPasteCookies()
      }
    : undefined

  return (
    <Dialog
      open={open}
      onClose={state === 'saving' ? undefined : close}
      maxWidth="sm"
      fullWidth
      fullScreen={phone}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20 }}>
        {account ? `Login ulang: ${account.name}` : `Login akun ${provider?.name ?? ''}`}
      </DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        {browserDown ? (
          // the sign-in browser isn't running: explain in plain words and offer the other way
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MonitorX size={40} color={theme.palette.text.secondary} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Login lewat browser belum tersedia
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 440, lineHeight: 1.6 }}>
              {pasteInstead
                ? `Service login-browser belum jalan di server. Sebagai admin kamu bisa menempel cookie, atau menyalakan service-nya.`
                : `Server belum menyalakan fitur login ${provider?.name ?? ''}. Pakai cara API key bila tersedia, atau hubungi admin.`}
            </Typography>
            {pasteInstead && (
              <Button
                variant="contained"
                size="large"
                startIcon={<KeyRound size={18} />}
                onClick={pasteInstead}
                fullWidth={phone}
              >
                Tempel cookie
              </Button>
            )}
            {isAdmin && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1 }}>
                Untuk admin: {errorMessage}
              </Typography>
            )}
          </div>
        ) : start.isError ? (
          <Alert
            severity="error"
            action={
              pasteInstead && (
                <Button color="inherit" size="small" onClick={pasteInstead}>
                  Tempel cookie
                </Button>
              )
            }
          >
            {errorMessage}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              Masukkan email dan password akun {provider?.name} di layar bawah ini. Begitu berhasil, akun{' '}
              <b>tersimpan otomatis</b> dan jendela ini menutup sendiri.
            </Typography>
            <Box
              className="relative overflow-hidden rounded"
              sx={{
                aspectRatio: `${LOGIN_SCREEN.width} / ${LOGIN_SCREEN.height}`,
                bgcolor: 'common.black',
                // phone: full width; larger screens: as tall as fits, so the login form stays big
                width: phone ? '100%' : 'auto',
                height: phone ? 'auto' : 'min(72vh, 960px)',
                maxWidth: '100%',
                mx: 'auto',
              }}
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
        <Button onClick={close} color="inherit" size="large" disabled={state === 'saving'} fullWidth={phone}>
          {state === 'waiting' && !start.isError ? 'Batal' : 'Tutup'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
