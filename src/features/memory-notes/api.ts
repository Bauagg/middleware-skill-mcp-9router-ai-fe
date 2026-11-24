import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api, getData } from '@/lib/axios'
import { notify } from '@/lib/notify'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export type MemoryStatus = 'proposed' | 'active' | 'corrected' | 'rejected' | 'deleted'
export type ResultSource = 'user' | 'data'

export interface MemoryNote {
  id: string
  user_id: string
  topic: string
  tried: string
  result: string
  result_source: ResultSource
  lesson: string
  status: MemoryStatus
  origin: 'extract' | 'manual'
  source_excerpt: string
  extract_model: string
  expires_at: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface MemoryMatchHit extends MemoryNote {
  matched: number
  rank: number
}

export interface MemoryMatchResult {
  query: string
  notes: MemoryMatchHit[]
  block: string
  tokens_est: number
}

export interface MemoryNoteFilter {
  status?: MemoryStatus
  q?: string
  page: number
  limit: number
}

export const memoryNoteSchema = z.object({
  topic: z.string().trim().min(1, 'Topik wajib diisi').max(200, 'Maksimal 200 karakter'),
  tried: z.string().trim().min(1, 'Wajib diisi').max(2000, 'Maksimal 2.000 karakter'),
  result: z.string().trim().min(1, 'Wajib diisi').max(2000, 'Maksimal 2.000 karakter'),
  result_source: z.enum(['user', 'data']),
  lesson: z.string().trim().min(1, 'Wajib diisi').max(2000, 'Maksimal 2.000 karakter'),
})

export type MemoryNoteInput = z.infer<typeof memoryNoteSchema>

export const memoryNoteKeys = {
  all: ['memory-notes'] as const,
  list: (f: MemoryNoteFilter) => [...memoryNoteKeys.all, 'list', f] as const,
  match: (q: string) => [...memoryNoteKeys.all, 'match', q] as const,
}

export function useMemoryNotes(filter: MemoryNoteFilter) {
  return useQuery({
    queryKey: memoryNoteKeys.list(filter),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<MemoryNote>>('/memory-notes', {
        params: {
          status: filter.status || undefined,
          q: filter.q || undefined,
          page: filter.page,
          limit: filter.limit,
        },
      })
      return { notes: res.data.data, meta: res.data.meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useMemoryMatch(q: string) {
  return useQuery({
    queryKey: memoryNoteKeys.match(q),
    queryFn: () => getData<MemoryMatchResult>('/memory-notes/match', { params: { q } }),
    enabled: q.trim().length > 0,
  })
}

/** All note mutations share the same success handling. */
function useNoteMutation<TVars>(fn: (vars: TVars) => Promise<ApiResponse<unknown>>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: memoryNoteKeys.all })
    },
  })
}

export function useCreateMemoryNote() {
  return useNoteMutation(async (input: MemoryNoteInput) => (await api.post('/memory-notes', input)).data)
}

export function useCorrectMemoryNote() {
  return useNoteMutation(
    async ({ id, ...input }: Partial<MemoryNoteInput> & { id: string }) =>
      (await api.put(`/memory-notes/${id}`, input)).data,
  )
}

export function useConfirmMemoryNote() {
  return useNoteMutation(async (id: string) => (await api.post(`/memory-notes/${id}/confirm`)).data)
}

export function useRejectMemoryNote() {
  return useNoteMutation(async (id: string) => (await api.post(`/memory-notes/${id}/reject`)).data)
}

export function useDeleteMemoryNote() {
  return useNoteMutation(async (id: string) => (await api.delete(`/memory-notes/${id}`)).data)
}
