import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getData } from '@/lib/axios'
import { notify } from '@/lib/notify'
import { mcpKeys } from '@/features/mcp/api'
import type { ApiResponse } from '@/types/api'
import { isInProgress } from './status'

export type InstallStatus =
  | 'pending_review'
  | 'approved'
  | 'starting'
  | 'running'
  | 'failed'
  | 'rejected'
  | 'stopped'

/** An MCP server installed from a GitHub repo (backend `View`: m_mcp_installs + derived fields). */
export interface McpInstall {
  id: string
  user_id: string
  name: string
  repo_url: string
  owner: string
  repo: string
  /** the exact commit that was analyzed and will run */
  commit_sha: string
  runtime: string
  install_command: string
  start_command: string
  transport: 'stdio' | 'http'
  http_path: string
  purpose: string
  /** installed by an admin: applies to every user */
  global: boolean
  /** admin install without sharing: each user runs their own container */
  per_user: boolean
  status: InstallStatus
  /** failure message, or the rejection reason */
  error?: string
  reviewed_by?: string
  reviewed_at?: string
  container_id?: string
  endpoint?: string
  created_at: string
  updated_at: string
  keywords: string[] | null
  /** names of the secrets it needs (values are never returned) */
  env_keys: string[] | null
  /** readable name of each secret (e.g. DSN -> "Koneksi database"); port and transport are set by the server and never listed */
  env_labels?: Record<string, string> | null
  /** per secret: plain-language name, what it is and how to get it, and a fake example (written from the repo's code) */
  env_guide?: Record<string, { label: string; help: string; example: string; multiline: boolean }> | null
  env_set: string[] | null
  env_missing: string[] | null
  /** signed link (24h) to the secrets form, when the viewer is allowed to fill it */
  env_url?: string
  /** per_user templates: the viewer's own container, if they started using it */
  my_instance?: McpInstallInstance
}

export interface McpInstallInstance {
  id: string
  install_id: string
  user_id: string
  status: InstallStatus
  error?: string
  container_id?: string
  endpoint?: string
  created_at: string
  updated_at: string
}

/** Result of analyzing a repo: it is cloned at one commit and inspected, nothing is executed. */
export interface RepoAnalysis {
  repo_url: string
  owner: string
  repo: string
  commit_sha: string
  folder: string
  runtime: string
  package_manager?: string
  package_name?: string
  scripts?: Record<string, string>
  bin?: Record<string, string>
  node_engine?: string
  python_scripts?: string[]
  has_dockerfile: boolean
  env_example?: string[]
  readme?: string
  files: number
}

export interface SubmitInstallInput {
  repo_url: string
  name: string
  install_command: string
  start_command: string
  transport: 'stdio' | 'http'
  http_path?: string
  env_keys: string[]
  keywords: string[]
  purpose: string
  /** required for admins: true = one shared container with the admin's secrets, false = one per user */
  shared?: boolean
}

export const mcpInstallKeys = {
  all: ['mcp-installs'] as const,
  list: (status: string) => [...mcpInstallKeys.all, 'list', status] as const,
}

/** Admins get every user's installs; regular users only their own plus admin installs. */
export function useMcpInstalls(status = '') {
  return useQuery({
    queryKey: mcpInstallKeys.list(status),
    queryFn: () => getData<McpInstall[]>('/mcp/installs', { params: { status: status || undefined } }),
    // a freshly approved install moves through starting → running on its own
    refetchInterval: (query) => (query.state.data?.some(isInProgress) ? 5000 : false),
  })
}

function useReviewMutation<TVars>(fn: (vars: TVars) => Promise<ApiResponse<McpInstall>>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: mcpInstallKeys.all })
      // an approved install registers a new MCP server
      void qc.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

/** Admin: approve. The container is created and started right away (once secrets are filled in). */
export function useApproveMcpInstall() {
  return useReviewMutation(
    async (id: string) => (await api.post<ApiResponse<McpInstall>>(`/mcp/installs/${id}/approve`)).data,
  )
}

/** Admin: reject a pending submission, optionally with a reason the user can see. */
export function useRejectMcpInstall() {
  return useReviewMutation(
    async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post<ApiResponse<McpInstall>>(`/mcp/installs/${id}/reject`, { reason: reason.trim() })).data,
  )
}

/** Readable name of a secret for the UI, falling back to the variable name. */
export const envLabel = (i: Pick<McpInstall, 'env_labels'>, key: string) => i.env_labels?.[key] ?? key

/** Clone the repo at its latest commit and inspect it (package.json, pyproject, .env.example, README). */
export function useAnalyzeRepo() {
  return useMutation({
    mutationFn: async (repoUrl: string) =>
      (await api.post<ApiResponse<RepoAnalysis>>('/mcp/installs/analyze', { repo_url: repoUrl.trim() }, { timeout: 180_000 }))
        .data.data,
    // the dialog shows the error inline
    meta: { silent: true },
  })
}

/** Regular user → pending_review (waits for an admin). Admin → approved right away, for all users. */
export function useSubmitInstall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitInstallInput) =>
      (await api.post<ApiResponse<McpInstall>>('/mcp/installs', input)).data,
    meta: { silent: true },
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: mcpInstallKeys.all })
    },
  })
}

function useInstallAction(path: 'start' | 'stop') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<ApiResponse<McpInstall>>(`/mcp/installs/${id}/${path}`, null, { timeout: 120_000 })).data,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: mcpInstallKeys.all })
      void qc.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

/** Start again (per_user template: the viewer's own container). */
export const useStartInstall = () => useInstallAction('start')

/** Stop and detach from chat (per_user template: the viewer's own container). */
export const useStopInstall = () => useInstallAction('stop')

/**
 * Delete container, server and data. Regular user on a per_user template: only their own container.
 * Admin on a per_user template: the template and every user's container.
 */
export function useRemoveInstall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete<ApiResponse<null>>(`/mcp/installs/${id}`, { timeout: 120_000 })).data,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: mcpInstallKeys.all })
      void qc.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

/** Last 200 log lines of the container. */
export function useInstallLogs(id: string | null) {
  return useQuery({
    queryKey: [...mcpInstallKeys.all, 'logs', id],
    queryFn: async () => (await getData<{ logs: string }>(`/mcp/installs/${id}/logs`)).logs,
    enabled: !!id,
    staleTime: 0,
    retry: false,
  })
}
