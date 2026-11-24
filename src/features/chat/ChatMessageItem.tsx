import { Alert, Box, Chip, Typography } from '@mui/material'
import { Clock, Plug, Sparkles } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatMs, formatNumber } from '@/lib/format'
import type { ChatMessage } from '@/stores/chatStore'

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <Box
          className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap"
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 15 }}
        >
          {message.content}
        </Box>
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
