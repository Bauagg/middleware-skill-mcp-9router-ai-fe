import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ArrowRight, Circle, CircleCheck, KeyRound, MessageSquare, Send, Settings2, Square } from 'lucide-react'
import { ChatMessageItem } from '@/features/chat/ChatMessageItem'
import { ChatSettings } from '@/features/chat/ChatSettings'
import { sendChat, type ChatTurn } from '@/features/chat/api'
import { RouterSettingsFields } from '@/features/router-settings/RouterSettingsFields'
import { useChatStore } from '@/stores/chatStore'
import { isRouterReady, missingRouterFields, useRouterSettings } from '@/stores/routerStore'

const examples = [
  'Berapa harga yang pas untuk kopi susu literan?',
  'Aku mau bikin promo diskon 50% lagi, gimana?',
  'Bikinin poster promo di Canva',
]

export function ChatPage() {
  const theme = useTheme()
  const isWide = useMediaQuery(theme.breakpoints.up('lg'))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [input, setInput] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { stream, systemPrompt, conversationId, messages, addMessage, updateMessage } = useChatStore()
  const router = useRouterSettings()
  const ready = isRouterReady(router)
  const missing = missingRouterFields(router)
  const busy = messages.some((m) => m.pending)

  // keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // stop a running stream when leaving the page
  useEffect(() => () => abortRef.current?.abort(), [])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy || !ready) return
    setInput('')

    const history: ChatTurn[] = [
      ...(systemPrompt.trim() ? [{ role: 'system' as const, content: systemPrompt.trim() }] : []),
      ...messages.filter((m) => !m.error && m.content).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ]
    addMessage({ id: crypto.randomUUID(), role: 'user', content })
    const replyId = crypto.randomUUID()
    addMessage({ id: replyId, role: 'assistant', content: '', pending: true })

    const controller = new AbortController()
    abortRef.current = controller
    const started = performance.now()
    try {
      const result = await sendChat({
        router,
        conversationId,
        messages: history,
        stream,
        signal: controller.signal,
        onDelta: (delta) => updateMessage(replyId, (m) => ({ content: m.content + delta })),
      })
      updateMessage(replyId, {
        content: result.content,
        skill: result.skill,
        mcpTools: result.mcpTools,
        usage: result.usage,
        pending: false,
        latencyMs: performance.now() - started,
      })
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      updateMessage(replyId, {
        pending: false,
        error: aborted ? undefined : err instanceof Error ? err.message : 'Request gagal',
        latencyMs: performance.now() - started,
      })
    } finally {
      abortRef.current = null
    }
  }

  const settingsPanel = (
    <Paper variant="outlined" className="h-full overflow-y-auto p-4">
      <Typography sx={{ fontWeight: 600, mb: 2 }}>Pengaturan</Typography>
      <ChatSettings />
    </Paper>
  )

  return (
    <div className="flex h-[calc(100dvh-88px)] gap-4 md:h-[calc(100dvh-8rem)]">
      <Paper variant="outlined" className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!isWide && (
          <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: theme.palette.divider }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              Model: <span className="font-mono">{router.model || '-'}</span>
            </Typography>
            <Button size="small" color="inherit" startIcon={<Settings2 size={16} />} onClick={() => setSettingsOpen(true)}>
              Pengaturan
            </Button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {messages.length === 0 && !ready ? (
            <RouterSetup missing={missing} inline={!isWide} />
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 text-center">
              <MessageSquare size={32} strokeWidth={1.5} />
              <Typography sx={{ fontWeight: 600 }}>Uji chat lewat middleware</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Setiap jawaban menampilkan skill yang disisipkan middleware dan jumlah token yang dipakai.
              </Typography>
              <div className="mt-2 flex flex-col gap-2">
                {examples.map((ex) => (
                  <Button key={ex} variant="outlined" color="inherit" size="small" onClick={() => send(ex)} disabled={!ready}>
                    {ex}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) => (
                <ChatMessageItem key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-3 sm:p-4" style={{ borderColor: theme.palette.divider }}>
          {!ready && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={
                !isWide && (
                  <Button color="inherit" size="small" onClick={() => setSettingsOpen(true)}>
                    Atur 9Router
                  </Button>
                )
              }
            >
              Untuk chat, lengkapi dulu 9Router milikmu. Belum diisi: <b>{missing.join(', ')}</b>.
            </Alert>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={6}
              placeholder={ready ? 'Tulis pesan… (Enter kirim, Shift+Enter baris baru)' : 'Lengkapi alamat, key, dan model 9Router dulu'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              disabled={!ready}
            />
            {busy ? (
              <Tooltip title="Hentikan">
                <IconButton onClick={() => abortRef.current?.abort()} aria-label="Hentikan" sx={{ border: 1, borderColor: 'divider', width: 48, height: 48 }}>
                  <Square size={18} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Kirim">
                <span>
                  <IconButton
                    type="submit"
                    color="primary"
                    disabled={!input.trim() || !ready}
                    aria-label="Kirim"
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark' },
                      '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                    }}
                  >
                    <Send size={18} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </form>
        </div>
      </Paper>

      {isWide && <aside className="w-80 shrink-0">{settingsPanel}</aside>}

      <Dialog open={!isWide && settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Pengaturan chat</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <ChatSettings autoFocus />
        </DialogContent>
      </Dialog>
    </div>
  )
}

const FIELD_LABEL: Record<string, string> = {
  alamat: 'Alamat 9Router',
  key: 'Key 9Router',
  model: 'Model',
}

/**
 * Shown in place of the empty conversation until the 9Router fields are filled in.
 * Narrow screens get the form right here; wide screens point to the settings panel on the right.
 */
function RouterSetup({ missing, inline }: { missing: string[]; inline: boolean }) {
  const all = ['alamat', 'key', 'model']
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <KeyRound size={32} strokeWidth={1.5} />
        <Typography sx={{ fontWeight: 600 }}>Hubungkan 9Router milikmu dulu</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Middleware tidak punya akun 9Router sendiri. Chat diteruskan ke 9Router milikmu, jadi isi tiga kolom ini
          sebelum mengirim pesan.
        </Typography>
      </div>

      <ul className="flex flex-col gap-1.5">
        {all.map((f) => {
          const done = !missing.includes(f)
          return (
            <li key={f} className="flex items-center gap-2">
              {done ? <CircleCheck size={18} className="text-green-600" /> : <Circle size={18} className="opacity-40" />}
              <Typography variant="body2" sx={{ fontWeight: done ? 400 : 600, color: done ? 'text.secondary' : 'text.primary' }}>
                {FIELD_LABEL[f]}
              </Typography>
            </li>
          )
        })}
      </ul>

      {inline ? (
        <RouterSettingsFields highlightMissing autoFocus />
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} className="flex items-center justify-center gap-1.5">
          Isi di panel Pengaturan di sebelah kanan <ArrowRight size={16} />
        </Typography>
      )}
    </div>
  )
}
