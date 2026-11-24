import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatUsage } from '@/features/chat/api'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  skill?: string | null
  mcpTools?: number
  usage?: ChatUsage | null
  error?: string
  pending?: boolean
  latencyMs?: number
}

interface ChatState {
  // settings (persisted). 9Router URL/key/model live in routerStore.
  stream: boolean
  systemPrompt: string
  // conversation (in memory only)
  conversationId: string
  messages: ChatMessage[]

  setSettings: (s: Partial<Pick<ChatState, 'stream' | 'systemPrompt'>>) => void
  addMessage: (m: ChatMessage) => void
  updateMessage: (id: string, patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) => void
  newConversation: () => void
}

const newId = () => crypto.randomUUID()

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      stream: true,
      systemPrompt: '',
      conversationId: newId(),
      messages: [],

      setSettings: (s) => set(s),
      addMessage: (m) => set((state) => ({ messages: [...state.messages, m] })),
      updateMessage: (id, patch) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m,
          ),
        })),
      newConversation: () => set({ conversationId: newId(), messages: [] }),
    }),
    {
      name: 'chat-settings',
      // v1 dropped apiKey/model (moved to per-account 9Router settings)
      version: 1,
      migrate: (old) => {
        const o = (old ?? {}) as { stream?: boolean; systemPrompt?: string }
        return { stream: o.stream ?? true, systemPrompt: o.systemPrompt ?? '' }
      },
      partialize: (s) => ({ stream: s.stream, systemPrompt: s.systemPrompt }),
    },
  ),
)
