import { MutationCache, QueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '@/lib/axios'
import { notify } from '@/lib/notify'

declare module '@tanstack/react-query' {
  interface Register {
    /** `silent: true` = the screen shows the error itself, skip the global toast */
    mutationMeta: { silent?: boolean }
  }
}

export const queryClient = new QueryClient({
  // Every failed mutation shows a toast; success toasts are per-hook (they use the backend message).
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.meta?.silent) notify.error(getErrorMessage(error))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
