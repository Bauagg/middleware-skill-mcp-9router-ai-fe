import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, getData } from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'

export interface UsageLog {
  id: string
  /** owner (login UUID or third-party X-User-Id) */
  user_id: string
  model: string
  path: string
  stream: boolean
  skill_name: string | null
  skill_score: number | null
  extra_tokens_est: number
  skill_variant: string | null
  budget_tokens: number
  selection_cache: string
  session_cache: string
  selection_method: string
  fallback_tokens: number
  context_pack_tokens_est: number
  memory_notes: number
  memory_note_ids: string
  memory_tokens_est: number
  mcp_tools_offered: number
  mcp_tools_tokens_est: number
  mcp_tool_calls: number
  mcp_tool_names: string
  mcp_steps: number
  status: number
  prompt_tokens: number | null
  completion_tokens: number | null
  cached_tokens: number | null
  latency_ms: number
  aborted: boolean
  created_at: string
}

export interface UsageSkillRow {
  /** "" = requests without a skill */
  skill: string
  requests: number
  with_usage: number
  avg_extra_tokens_est: number
  avg_prompt_tokens: number | null
  avg_completion_tokens: number | null
  avg_cached_tokens: number | null
  avg_latency_ms: number
}

export interface UsageSummary {
  skills: UsageSkillRow[]
  selection_cache: Record<string, number>
  session_cache: Record<string, number>
  variants: Record<string, number>
  selection_methods: Record<string, number>
  memory: {
    with_context_pack: number
    with_memory_notes: number
    avg_context_pack_tokens_est: number
    avg_memory_tokens_est: number
    avg_memory_notes: number
  }
  mcp: {
    with_tools_offered: number
    with_tool_calls: number
    avg_tools_tokens_est: number
    avg_tool_calls: number
    avg_steps_with_calls: number
  }
}

export interface UsageLogFilter {
  page: number
  limit: number
  model?: string
  skill?: string
  /** admin only: filter by owner (ignored by the backend for regular users) */
  user_id?: string
}

export interface UsageSummaryFilter {
  /** YYYY-MM-DD, inclusive */
  from?: string
  /** YYYY-MM-DD, exclusive */
  to?: string
  /** admin only: filter by owner */
  user_id?: string
}

export const usageKeys = {
  all: ['usage'] as const,
  logs: (f: UsageLogFilter) => [...usageKeys.all, 'logs', f] as const,
  summary: (f: UsageSummaryFilter) => [...usageKeys.all, 'summary', f] as const,
}

export function useUsageLogs(filter: UsageLogFilter) {
  return useQuery({
    queryKey: usageKeys.logs(filter),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<UsageLog>>('/usage-logs', {
        params: {
          page: filter.page,
          limit: filter.limit,
          model: filter.model || undefined,
          skill: filter.skill || undefined,
          user_id: filter.user_id || undefined,
        },
      })
      return { logs: res.data.data, meta: res.data.meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useUsageSummary(filter: UsageSummaryFilter) {
  return useQuery({
    queryKey: usageKeys.summary(filter),
    queryFn: () =>
      getData<UsageSummary>('/usage-logs/summary', {
        params: { from: filter.from || undefined, to: filter.to || undefined, user_id: filter.user_id || undefined },
      }),
    placeholderData: keepPreviousData,
  })
}
