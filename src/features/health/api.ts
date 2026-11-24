import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

export const healthKeys = {
  ping: ['health', 'ping'] as const,
}

/** GET /api/ping → { message: "pong" } (not wrapped in the envelope). */
export function useBackendPing() {
  return useQuery({
    queryKey: healthKeys.ping,
    queryFn: async () => (await api.get<{ message: string }>('/ping')).data,
  })
}
