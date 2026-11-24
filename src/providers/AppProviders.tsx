import { useMemo, type ReactNode } from 'react'
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material'
import { StyledEngineProvider } from '@mui/material/styles'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Notifier } from '@/components/common/Notifier'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useUiStore } from '@/stores/uiStore'
import { buildTheme } from '@/theme/theme'

// Data is per account: when the account changes (login, logout, forced logout after a
// failed refresh), drop every cached query and the open conversation.
useAuthStore.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id) {
    queryClient.clear()
    useChatStore.getState().newConversation()
  }
})

export function AppProviders({ children }: { children: ReactNode }) {
  const colorMode = useUiStore((s) => s.colorMode)
  const theme = useMemo(() => buildTheme(colorMode), [colorMode])

  return (
    <StyledEngineProvider enableCssLayer>
      {/* Emotion injects before Tailwind's CSS, so the layer order must be declared here too,
          otherwise Tailwind's preflight (base layer) overrides every MUI style. */}
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          {children}
          <Notifier />
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </QueryClientProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  )
}
