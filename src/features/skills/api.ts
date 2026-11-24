import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getData } from '@/lib/axios'
import { notify } from '@/lib/notify'
import { routerHeaders, type RouterSettings } from '@/stores/routerStore'
import type { ApiResponse } from '@/types/api'

export interface Skill {
  name: string
  description: string
  files: number
  has_short: boolean
  size_bytes: number
  updated_at: string
  /** Present when SKILL.md could not be parsed. */
  error?: string
}

export interface UploadedSkill {
  name: string
  description: string
  files: number
  has_short: boolean
  replaced: boolean
}

export interface SkillUploadResult {
  skills: UploadedSkill[]
  skipped_files: string[] | null
}

export interface SkillMatchCandidate {
  name: string
  description: string
  score: number
}

export interface SkillMatchResult {
  query: string
  method: 'bm25' | 'embedding' | 'fallback'
  threshold: number
  ambiguous: boolean
  fallback_enabled: boolean
  fallback_tokens: number
  selected: string | null
  candidates: SkillMatchCandidate[]
}

export type SkillVariant = 'full' | 'short' | 'truncated'

export interface SkillPreview {
  name: string
  /** 0 = no limit */
  budget: number
  text: string
  tokens: number
  variant: SkillVariant
  removed_lines: number
  removed_blocks: number
}

export interface SkillMatchParams {
  q: string
  limit: number
  fallback: boolean
}

export interface SkillPreviewParams {
  model?: string
  budget?: number
}

export const skillKeys = {
  all: ['skills'] as const,
  list: () => [...skillKeys.all, 'list'] as const,
  match: (p: SkillMatchParams) => [...skillKeys.all, 'match', p] as const,
  preview: (name: string, p: SkillPreviewParams) => [...skillKeys.all, 'preview', name, p] as const,
}

export function useSkills() {
  return useQuery({
    queryKey: skillKeys.list(),
    queryFn: () => getData<Skill[]>('/skills'),
  })
}

/** With `fallback`, the backend asks a model when scores are ambiguous: that runs on the caller's 9Router. */
export function useSkillMatch(params: SkillMatchParams | null, router: RouterSettings) {
  return useQuery({
    queryKey: skillKeys.match(params ?? { q: '', limit: 5, fallback: false }),
    queryFn: () =>
      getData<SkillMatchResult>('/skills/match', {
        params: {
          q: params!.q,
          limit: params!.limit,
          fallback: params!.fallback,
          model: params!.fallback ? router.model.trim() : undefined,
        },
        headers: params!.fallback ? routerHeaders(router) : undefined,
      }),
    enabled: !!params?.q,
    placeholderData: keepPreviousData,
  })
}

export function useSkillPreview(name: string | null, params: SkillPreviewParams) {
  return useQuery({
    queryKey: skillKeys.preview(name ?? '', params),
    queryFn: () =>
      getData<SkillPreview>(`/skills/preview/${encodeURIComponent(name!)}`, {
        params: {
          model: params.model || undefined,
          budget: params.budget ?? undefined,
        },
      }),
    enabled: !!name,
    placeholderData: keepPreviousData,
  })
}

/** Download installed skills as a zip (no names = all). Goes through axios so the login token is sent. */
export async function downloadSkills(names?: string[]) {
  const res = await api.get<Blob>('/skills/export', {
    params: { names: names?.length ? names.join(',') : undefined },
    responseType: 'blob',
    timeout: 120_000,
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = names?.length === 1 ? `${names[0]}.zip` : 'skills.zip'
  a.click()
  URL.revokeObjectURL(url)
}

export function useUploadSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, overwrite }: { file: File; overwrite: boolean }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('overwrite', String(overwrite))
      const res = await api.post<ApiResponse<SkillUploadResult>>('/skills/upload', form, { timeout: 120_000 })
      return res.data
    },
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: skillKeys.all })
    },
  })
}
