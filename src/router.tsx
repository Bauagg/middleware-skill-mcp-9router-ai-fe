import { createBrowserRouter } from 'react-router-dom'
import { GuestOnly, RequireAdmin, RequireAuth } from '@/components/auth/RouteGuards'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingState } from '@/components/common/States'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RegisterPage } from '@/pages/RegisterPage'

// Feature pages are code-split: each loads the first time its menu is opened.
export const router = createBrowserRouter([
  {
    hydrateFallbackElement: <LoadingState />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'chat', lazy: async () => ({ Component: (await import('@/pages/ChatPage')).ChatPage }) },
              { path: 'skills', lazy: async () => ({ Component: (await import('@/pages/SkillsPage')).SkillsPage }) },
              {
                path: 'context-packs',
                lazy: async () => ({ Component: (await import('@/pages/ContextPacksPage')).ContextPacksPage }),
              },
              {
                path: 'memory-notes',
                lazy: async () => ({ Component: (await import('@/pages/MemoryNotesPage')).MemoryNotesPage }),
              },
              { path: 'gallery', lazy: async () => ({ Component: (await import('@/pages/ImagesPage')).ImagesPage }) },
              {
                path: 'ai-accounts',
                lazy: async () => ({ Component: (await import('@/pages/AIAccountsPage')).AIAccountsPage }),
              },
              {
                path: 'video-gallery',
                lazy: async () => ({ Component: (await import('@/pages/VideosPage')).VideosPage }),
              },
              { path: 'mcp', lazy: async () => ({ Component: (await import('@/pages/McpPage')).McpPage }) },
              {
                path: 'mcp-installs',
                lazy: async () => ({ Component: (await import('@/pages/McpInstallsPage')).McpInstallsPage }),
              },
              {
                element: <RequireAdmin />,
                children: [
                  {
                    path: 'mcp-approvals',
                    lazy: async () => ({ Component: (await import('@/pages/McpApprovalsPage')).McpApprovalsPage }),
                  },
                ],
              },
              { path: 'usage', lazy: async () => ({ Component: (await import('@/pages/UsagePage')).UsagePage }) },
              { path: 'evals', lazy: async () => ({ Component: (await import('@/pages/EvalsPage')).EvalsPage }) },
              {
                path: 'evals/:runId',
                lazy: async () => ({ Component: (await import('@/pages/EvalRunPage')).EvalRunPage }),
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
