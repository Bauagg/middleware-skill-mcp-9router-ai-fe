import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getData } from '@/lib/axios'
import { notify } from '@/lib/notify'
import type { ApiResponse } from '@/types/api'

export type McpState = 'disabled' | 'connecting' | 'needs_login' | 'connected' | 'error'

export interface McpServer {
  name: string
  url: string
  /** added by this user (private, or global when the user is admin) */
  own: boolean
  /** created by an admin: applies to every user */
  global: boolean
  /** every user uses the admin's login for this server */
  shared_login: boolean
  state: McpState
  error?: string
  tools: number
  read_only_tools: number
  logged_in: boolean
  token_expires_at?: string
  refreshed_at?: string
  connect_url: string
}

export interface McpTool {
  /** Name the model sees: <server>__<tool> */
  name: string
  server: string
  tool: string
  title?: string
  description: string
  read_only: boolean
  /** Only set when queried with q */
  score?: number
  selected?: boolean
}

export const mcpKeys = {
  all: ['mcp'] as const,
  servers: () => [...mcpKeys.all, 'servers'] as const,
  tools: (q: string) => [...mcpKeys.all, 'tools', q] as const,
}

export function useMcpServers() {
  return useQuery({
    queryKey: mcpKeys.servers(),
    queryFn: () => getData<McpServer[]>('/mcp/servers'),
    // the user comes back from the OAuth tab: refresh right away
    refetchOnWindowFocus: true,
    refetchInterval: (query) => (query.state.data?.some((s) => s.state === 'connecting') ? 3000 : false),
  })
}

export function useMcpTools(q: string) {
  return useQuery({
    queryKey: mcpKeys.tools(q),
    queryFn: () => getData<McpTool[]>('/mcp/tools', { params: { q: q || undefined } }),
    placeholderData: keepPreviousData,
  })
}

function useServerMutation(fn: (name: string) => Promise<ApiResponse<McpServer>>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

export function useRefreshMcpServer() {
  return useServerMutation(
    async (name) =>
      (await api.post<ApiResponse<McpServer>>(`/mcp/servers/${encodeURIComponent(name)}/refresh`, null, {
        timeout: 120_000,
      })).data,
  )
}

export function useLogoutMcpServer() {
  return useServerMutation(
    async (name) =>
      (await api.delete<ApiResponse<McpServer>>(`/mcp/servers/${encodeURIComponent(name)}/connection`)).data,
  )
}

export interface AddMcpServerInput {
  name: string
  url: string
  keywords: string[]
  /** admin only: everyone uses the admin's login */
  shared_login: boolean
}

/** Admin → server for all users; regular user → private server. The backend checks the URL first. */
export function useAddMcpServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddMcpServerInput) =>
      (await api.post<ApiResponse<McpServer>>('/mcp/servers', input, { timeout: 60_000 })).data,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

/** Remove a server added by this user (admin: also global ones, which disappear for everyone). */
export function useRemoveMcpServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) =>
      (await api.delete<ApiResponse<null>>(`/mcp/servers/${encodeURIComponent(name)}`)).data,
    onSuccess: (res) => {
      notify.success(res.message)
      void qc.invalidateQueries({ queryKey: mcpKeys.all })
    },
  })
}

/** Server added through the API (m_mcp_servers): a user's private one, an admin's global one, or a GitHub install. */
export interface McpUserServer {
  id: string
  user_id: string
  name: string
  url: string
  /** JSON array as a string */
  keywords: string
  global: boolean
  shared_login: boolean
  /** registered by an MCP install from GitHub */
  installed: boolean
  created_at: string
  updated_at: string
}

export interface McpConnection {
  user_id: string
  server: string
  logged_in: boolean
  expires_at?: string
  connected_at?: string
}

export interface McpAdminOverview {
  /** servers from mcp.json, for every user */
  builtin: string[]
  user_servers: McpUserServer[]
  /** who is logged in to which server */
  connections: McpConnection[]
}

/** Admin only (403 otherwise): extra servers and login status of every user. */
export function useMcpAdminOverview(enabled: boolean) {
  return useQuery({
    queryKey: [...mcpKeys.all, 'admin-overview'],
    queryFn: () => getData<McpAdminOverview>('/mcp/admin/servers'),
    enabled,
  })
}
