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
import {
  ArrowRight,
  Circle,
  CircleCheck,
  FileText,
  KeyRound,
  MessageSquare,
  Paperclip,
  Send,
  Settings2,
  Square,
  Upload,
  X,
} from 'lucide-react'
import { ChatMessageItem } from '@/features/chat/ChatMessageItem'
import { ChatSettings } from '@/features/chat/ChatSettings'
import { sendChat, type ChatTurn } from '@/features/chat/api'
import {
  ACCEPT,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  formatSize,
  readAttachment,
  rejectReason,
  toContent,
  type Attachment,
} from '@/features/chat/attachments'
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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
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

  /** Read and attach files (picker, drop or paste), skipping the ones that can't be sent. */
  const attach = async (files: File[]) => {
    if (files.length === 0) return
    const problems: string[] = []
    const next = [...attachments]
    for (const f of files) {
      const reason = rejectReason(f)
      if (reason) {
        problems.push(reason)
        continue
      }
      if (next.length >= MAX_FILES) {
        problems.push(`maksimal ${MAX_FILES} lampiran per pesan`)
        break
      }
      try {
        const a = await readAttachment(f)
        if (next.reduce((n, x) => n + x.size, 0) + a.size > MAX_TOTAL_BYTES) {
          problems.push(`${f.name}: total lampiran lebih dari ${MAX_TOTAL_BYTES >> 20} MB`)
          continue
        }
        next.push(a)
      } catch {
        problems.push(`${f.name}: tidak bisa dibaca`)
      }
    }
    setAttachments(next)
    setAttachError(problems.length ? problems.join('; ') : null)
  }

  const send = async (text: string) => {
    const content = text.trim()
    if ((!content && attachments.length === 0) || busy || !ready) return
    const sent = attachments
    setInput('')
    setAttachments([])
    setAttachError(null)

    const history: ChatTurn[] = [
      ...(systemPrompt.trim() ? [{ role: 'system' as const, content: systemPrompt.trim() }] : []),
      ...messages
        .filter((m) => !m.error && (m.content || m.attachments?.length))
        .map((m) => ({ role: m.role, content: toContent(m.content, m.attachments) })),
      { role: 'user', content: toContent(content, sent) },
    ]
    addMessage({ id: crypto.randomUUID(), role: 'user', content, attachments: sent })
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
      <Paper
        variant="outlined"
        className="relative flex min-w-0 flex-1 flex-col overflow-hidden"
        onDragOver={(e) => {
          if (!ready || !e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(e) => {
          if (!ready) return
          e.preventDefault()
          setDragging(false)
          void attach(Array.from(e.dataTransfer.files))
        }}
      >
        {dragging && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 border-2 border-dashed"
            style={{ borderColor: theme.palette.primary.main, background: theme.palette.background.paper + 'e6' }}
          >
            <Upload size={32} />
            <Typography sx={{ fontWeight: 600 }}>Lepas untuk melampirkan</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Gambar, PDF, Word, Excel, PowerPoint, CSV, teks
            </Typography>
          </div>
        )}
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
          {attachError && (
            <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setAttachError(null)}>
              {attachError}
            </Alert>
          )}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <AttachmentPreview
                  key={a.id}
                  attachment={a}
                  onRemove={() => setAttachments((list) => list.filter((x) => x.id !== a.id))}
                />
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              void attach(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <Tooltip title="Lampirkan gambar atau file (PDF, Word, Excel, PowerPoint, CSV)">
              <span>
                <IconButton
                  onClick={() => fileRef.current?.click()}
                  disabled={!ready || busy}
                  aria-label="Lampirkan file"
                  sx={{ border: 1, borderColor: 'divider', width: 48, height: 48 }}
                >
                  <Paperclip size={18} />
                </IconButton>
              </span>
            </Tooltip>
            <TextField
              fullWidth
              multiline
              maxRows={6}
              placeholder={ready ? 'Tulis pesan… (Enter kirim, Shift+Enter baris baru)' : 'Lengkapi alamat, key, dan model 9Router dulu'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files)
                if (files.length > 0) {
                  e.preventDefault()
                  void attach(files)
                }
              }}
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
                    disabled={(!input.trim() && attachments.length === 0) || !ready}
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

/** A pending attachment above the input: thumbnail for images, name and size for documents. */
function AttachmentPreview({ attachment: a, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  return (
    <Paper variant="outlined" className="relative flex items-center gap-2 overflow-hidden rounded-xl p-1.5 pr-8">
      {a.kind === 'image' ? (
        <img src={a.dataUrl} alt={a.name} className="h-12 w-12 rounded-lg object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/5">
          <FileText size={22} />
        </div>
      )}
      <div className="min-w-0 max-w-44">
        <Typography variant="body2" noWrap title={a.name}>
          {a.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatSize(a.size)}
        </Typography>
      </div>
      <IconButton size="small" onClick={onRemove} aria-label={`Hapus ${a.name}`} sx={{ position: 'absolute', top: 2, right: 2 }}>
        <X size={14} />
      </IconButton>
    </Paper>
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
