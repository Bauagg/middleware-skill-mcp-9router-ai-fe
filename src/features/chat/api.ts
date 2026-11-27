import { useQuery } from '@tanstack/react-query'
import { authFetch } from '@/lib/authFetch'
import { hasRouterAccess, routerHeaders, type RouterSettings } from '@/stores/routerStore'
import type { ContentPart } from './attachments'

/**
 * Chat goes through the OpenAI-compatible proxy at /v1 (not /api): the login token identifies the
 * user, and X-Router-URL / X-Router-Key point at the user's own 9Router. fetch is used instead of
 * axios so the SSE stream can be read.
 */

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant'
  /** parts when the message has attachments (images, documents) */
  content: string | ContentPart[]
}

export interface ChatUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export interface ChatResult {
  content: string
  /** Skill the middleware injected (X-Skill header). */
  skill: string | null
  /** Number of MCP tools sent to the model (X-MCP-Tools header). */
  mcpTools: number
  usage: ChatUsage | null
}

interface SendChatOptions {
  router: RouterSettings
  conversationId: string
  messages: ChatTurn[]
  stream: boolean
  signal?: AbortSignal
  onDelta?: (text: string) => void
}

/** Read an error body from /v1: { error: { message } }, { error: "..." } or plain text. */
async function readError(res: Response): Promise<Error> {
  const text = await res.text()
  try {
    const body = JSON.parse(text) as { error?: string | { message?: string }; message?: string }
    const msg = typeof body.error === 'string' ? body.error : body.error?.message ?? body.message
    if (msg) return new Error(msg)
  } catch {
    // not JSON
  }
  return new Error(text.trim() || `Request gagal (${res.status})`)
}

export async function sendChat({ router, conversationId, messages, stream, signal, onDelta }: SendChatOptions): Promise<ChatResult> {
  const res = await authFetch('/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Conversation-Id': conversationId,
      ...routerHeaders(router),
    },
    body: JSON.stringify({
      model: router.model.trim(),
      messages,
      stream,
      // ask for token usage in the stream so the usage log records it
      ...(stream ? { stream_options: { include_usage: true } } : {}),
    }),
  })

  if (!res.ok) throw await readError(res)

  const skill = res.headers.get('X-Skill')
  const mcpTools = Number(res.headers.get('X-MCP-Tools') ?? 0)
  let content = ''
  let usage: ChatUsage | null = null

  const isSse = res.headers.get('Content-Type')?.includes('text/event-stream')
  if (isSse && res.body) {
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() ?? ''
      for (const event of events) {
        // lines starting with ":" are keep-alive comments
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim())
          .join('')
        if (!data || data === '[DONE]') continue
        const chunk = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[]
          usage?: ChatUsage
          error?: string | { message?: string }
        }
        if (chunk.error) {
          throw new Error(typeof chunk.error === 'string' ? chunk.error : chunk.error.message ?? 'Stream gagal')
        }
        const delta = chunk.choices?.[0]?.delta?.content
        if (delta) {
          content += delta
          onDelta?.(delta)
        }
        if (chunk.usage) usage = chunk.usage
      }
    }
  } else {
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: ChatUsage }
    content = body.choices?.[0]?.message?.content ?? ''
    usage = body.usage ?? null
    onDelta?.(content)
  }

  return { content, skill: skill || null, mcpTools, usage }
}

export interface ModelInfo {
  id: string
  owned_by?: string
}

/** Models of the user's own 9Router (GET /v1/models through the middleware). */
export function useModels(router: Pick<RouterSettings, 'url' | 'key'>) {
  const url = router.url.trim()
  const key = router.key.trim()
  return useQuery({
    queryKey: ['v1', 'models', url, key],
    queryFn: async () => {
      const res = await authFetch('/v1/models', { headers: routerHeaders({ url, key }) })
      if (!res.ok) throw await readError(res)
      const body = (await res.json()) as { data?: ModelInfo[] }
      return body.data ?? []
    },
    enabled: hasRouterAccess({ url, key }),
    staleTime: 5 * 60_000,
    retry: false,
  })
}
