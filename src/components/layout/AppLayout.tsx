import { useState } from 'react'
import { AppBar, Badge, Box, Drawer, IconButton, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { KeyRound, Menu, Moon, Sun } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { findNavItem } from '@/config/navigation'
import { RouterSettingsDialog } from '@/features/router-settings/RouterSettingsDialog'
import { isRouterReady, useRouterSettings } from '@/stores/routerStore'
import { useUiStore } from '@/stores/uiStore'
import { Sidebar } from './Sidebar'

const DRAWER_WIDTH = 264

export function AppLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const { colorMode, toggleColorMode } = useUiStore()
  const { pathname } = useLocation()
  const current = findNavItem(pathname)
  const [routerOpen, setRouterOpen] = useState(false)
  const routerReady = isRouterReady(useRouterSettings())

  return (
    <Box className="flex min-h-full" sx={{ bgcolor: 'background.default' }}>
      <Box component="aside" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isDesktop ? (
          <Drawer variant="permanent" open slotProps={{ paper: { sx: { width: DRAWER_WIDTH } } }}>
            <Sidebar />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            slotProps={{ paper: { sx: { width: DRAWER_WIDTH } } }}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        )}
      </Box>

      <Box className="flex min-w-0 flex-1 flex-col">
        <AppBar
          position="sticky"
          elevation={0}
          color="inherit"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar className="gap-2">
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
                <Menu size={20} />
              </IconButton>
            )}
            <Typography variant="h6" component="h1" noWrap className="flex-1" sx={{ fontWeight: 600 }}>
              {current?.label ?? 'Middleware AI'}
            </Typography>
            <Tooltip title={routerReady ? 'Pengaturan 9Router' : 'Pengaturan 9Router belum lengkap'}>
              <IconButton onClick={() => setRouterOpen(true)} aria-label="Pengaturan 9Router">
                <Badge variant="dot" color="warning" invisible={routerReady}>
                  <KeyRound size={18} />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={colorMode === 'light' ? 'Mode gelap' : 'Mode terang'}>
              <IconButton onClick={toggleColorMode} aria-label="Ganti mode warna">
                {colorMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" className="w-full flex-1 p-4 md:p-8">
          <Outlet />
        </Box>
      </Box>

      <RouterSettingsDialog open={routerOpen} onClose={() => setRouterOpen(false)} />
    </Box>
  )
}
