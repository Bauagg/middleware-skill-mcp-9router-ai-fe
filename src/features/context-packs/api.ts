import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api, getData } from '@/lib/axios'
import { notify } from '@/lib/notify'
import type { ApiResponse } from '@/types/api'

export interface ContextPack {
  id: string
  user_id: string
  name: string
  content: string
  active: boolean
  created_at: string
  updated_at: string
}

export const contextPackSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Maksimal 100 karakter'),
  content: z.string().trim().min(1, 'Isi wajib diisi').max(20000, 'Maksimal 20.000 karakter'),
  active: z.boolean(),
})

export type ContextPackInput = z.infer<typeof contextPackSchema>

export const contextPackKeys = {
  all: ['context-packs'] as const,
}

export function useContextPacks() {
  return useQuery({
    queryKey: contextPackKeys.all,
    queryFn: () => getData<ContextPack[]>('/context-packs'),
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: contextPackKeys.all })
}

export function useCreateContextPack() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: ContextPackInput) =>
      (await api.post<ApiResponse<ContextPack>>('/context-packs', input)).data,
    onSuccess: (res) => {
      notify.success(res.message)
      void invalidate()
    },
  })
}

export function useUpdateContextPack() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ContextPackInput> & { id: string }) =>
      (await api.put<ApiResponse<ContextPack>>(`/context-packs/${id}`, input)).data,
    onSuccess: (res) => {
      notify.success(res.message)
      void invalidate()
    },
  })
}

export function useDeleteContextPack() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => (await api.delete<ApiResponse<null>>(`/context-packs/${id}`)).data,
    onSuccess: (res) => {
      notify.success(res.message)
      void invalidate()
    },
  })
}
