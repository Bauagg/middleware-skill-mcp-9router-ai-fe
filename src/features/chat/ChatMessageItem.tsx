import { Alert, Box, Chip, Typography } from '@mui/material'
import { Clock, FileText, Plug, Sparkles } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatMs, formatNumber } from '@/lib/format'
import { formatSize } from './attachments'
import type { ChatMessage } from '@/stores/chatStore'

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    const images = message.attachments?.filter((a) => a.kind === 'image') ?? []
    const files = message.attachments?.filter((a) => a.kind === 'file') ?? []
    return (
      <div className="flex flex-col items-end gap-1.5">
        {images.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
            {images.map((a) => (
              <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer" title={a.name}>
                <img src={a.dataUrl} alt={a.name} className="h-32 max-w-56 rounded-xl border object-cover" />
              </a>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
            {files.map((a) => (
              <Chip key={a.id} icon={<FileText size={14} />} label={`${a.name} · ${formatSize(a.size)}`} variant="outlined" />
            ))}
          </div>
        )}
        {message.content && (
          <Box
            className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap"
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 15 }}
          >
            {message.content}
          </Box>
        )}
      </div>
    )
  }

  const done = !message.pending
  return (
    <div className="flex max-w-full flex-col gap-2">
      {message.content ? (
        <Box className="markdown max-w-none text-[15px] leading-relaxed">
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          {message.pending && <span className="typing-caret" aria-hidden />}
        </Box>
      ) : message.pending ? (
        <Typography sx={{ color: 'text.secondary' }} className="animate-pulse">
          Menunggu jawaban…
        </Typography>
      ) : null}

      {message.error && <Alert severity="error">{message.error}</Alert>}

      {done && !message.error && (
        <div className="flex flex-wrap gap-1.5">
          <Chip
            size="small"
            variant="outlined"
            icon={<Sparkles size={14} />}
            label={message.skill ? `Skill: ${message.skill}` : 'Tanpa skill'}
          />
          {!!message.mcpTools && <Chip size="small" variant="outlined" icon={<Plug size={14} />} label={`${message.mcpTools} tool MCP`} />}
          {message.usage?.prompt_tokens != null && (
            <Chip
              size="small"
              variant="outlined"
              label={`${formatNumber(message.usage.prompt_tokens)} → ${formatNumber(message.usage.completion_tokens)} token`}
            />
          )}
          {message.latencyMs != null && (
            <Chip size="small" variant="outlined" icon={<Clock size={14} />} label={formatMs(message.latencyMs)} />
          )}
        </div>
      )}
    </div>
  )
}
