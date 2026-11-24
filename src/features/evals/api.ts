import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getData } from '@/lib/axios'
import { notify } from '@/lib/notify'
import { routerHeaders, type RouterSettings } from '@/stores/routerStore'
import type { ApiResponse } from '@/types/api'

export type EvalVariant = 'full' | 'short' | 'none'
export const EVAL_VARIANTS: EvalVariant[] = ['full', 'short', 'none']

export interface EvalRunInput {
  skill: string
  variants?: EvalVariant[]
  /** 9Router model under test (required) */
  model: string
  /** judge model; empty = same as model */
  judge_model?: string
  limit?: number
}

export interface EvalRunStarted {
  run_id: string
  skill: string
  skill_version: string
  variants: string[]
  cases: number
  jobs: number
  model: string
  judge_model: string
}

export interface EvalRunListItem {
  run_id: string
  user_id: string
  skill: string
  skill_version: string
  model: string
  judge_model: string
  started_at: string
  row_count: number
  avg_score: number | null
}

export interface EvalVariantSummary {
  variant: string
  cases: number
  scored: number
  avg_score: number | null
  avg_skill_tokens: number
  avg_prompt_tokens: number | null
  errors: number
}

export interface EvalRow {
  id: string
  user_id: string
  run_id: string
  skill: string
  skill_version: string
  variant: string
  model: string
  judge_model: string
  case_index: number
  question: string
  criteria: string
  answer: string
  score: number | null
  reason: string
  skill_tokens_est: number
  prompt_tokens: number | null
  completion_tokens: number | null
  judge_tokens: number
  latency_ms: number
  error?: string
  created_at: string
}

export interface EvalRunSummary {
  run_id: string
  skill: string
  skill_version: string
  model: string
  judge_model: string
  status: 'running' | 'done'
  total: number
  completed: number
  variants: EvalVariantSummary[]
  notes: string[]
  rows?: EvalRow[]
}

export const evalKeys = {
  all: ['evals'] as const,
  runs: (skill: string) => [...evalKeys.all, 'runs', skill] as const,
  run: (id: string, detail: boolean) => [...evalKeys.all, 'run', id, detail] as const,
}

export function useEvalRuns(skill = '') {
  return useQuery({
    queryKey: evalKeys.runs(skill),
    queryFn: () => getData<EvalRunListItem[]>('/evals/runs', { params: { skill: skill || undefined, limit: 100 } }),
  })
}

export function useEvalRun(id: string, detail: boolean) {
  return useQuery({
    queryKey: evalKeys.run(id, detail),
    queryFn: () => getData<EvalRunSummary>(`/evals/runs/${id}`, { params: { detail: detail || undefined } }),
    // keep polling while the run is still in progress
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 3000 : false),
  })
}

/** Runs on the caller's own 9Router: needs X-Router-URL and X-Router-Key. */
export function useStartEval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, router }: { input: EvalRunInput; router: Pick<RouterSettings, 'url' | 'key'> }) =>
      (await api.post<ApiResponse<EvalRunStarted>>('/evals/runs', input, { headers: routerHeaders(router) })).data,
    onSuccess: () => {
      notify.success('Eval dimulai')
      void qc.invalidateQueries({ queryKey: evalKeys.all })
    },
  })
}
