import {
  Avatar,
  Chip,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Tooltip,
  Typography,
} from '@mui/material'
import { Bot, LogOut, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { navSectionsFor } from '@/config/navigation'
import { useAuthStore } from '@/stores/authStore'

interface SidebarProps {
  /** Called after a menu item is clicked (closes the mobile drawer). */
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <Box className="flex h-full flex-col">
      <Box className="flex items-center gap-3 px-5 py-4">
        <Box
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
        >
          <Bot size={20} />
        </Box>
        <Box className="min-w-0">
          <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>Middleware AI</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Skill · Memory · MCP
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box component="nav" aria-label="Menu utama" className="flex-1 overflow-y-auto px-3 py-2">
        {navSectionsFor(user?.role).map((section) => (
          <List
            key={section.title}
            dense
            disablePadding
            className="pb-2"
            subheader={
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: 'transparent',
                  lineHeight: '32px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {section.title}
              </ListSubheader>
            }
          >
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <ListItemButton
                  key={item.path}
                  component={NavLink}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onNavigate}
                  sx={{
                    borderRadius: 2,
                    mb: 0.25,
                    color: 'text.secondary',
                    '&.active': {
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
                    <Icon size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 500 } } }}
                  />
                </ListItemButton>
              )
            })}
          </List>
        ))}
      </Box>

      <Divider />

      <Box className="flex items-center gap-3 px-4 py-3">
        <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}>
          {user?.email.charAt(0).toUpperCase() ?? '?'}
        </Avatar>
        <Box className="min-w-0 flex-1">
          <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }} title={user?.email}>
            {user?.email.split('@')[0] ?? 'Tamu'}
          </Typography>
          <div className="flex items-center gap-1.5">
            {user?.role === 'admin' ? (
              <Chip size="small" color="primary" icon={<ShieldCheck size={12} />} label="Admin" sx={{ height: 18, fontSize: 11 }} />
            ) : (
              <Chip size="small" variant="outlined" label="User" sx={{ height: 18, fontSize: 11 }} />
            )}
            <Typography noWrap variant="caption" sx={{ color: 'text.secondary' }}>
              {user?.email}
            </Typography>
          </div>
        </Box>
        <Tooltip title="Keluar">
          <IconButton size="small" onClick={logout} aria-label="Keluar">
            <LogOut size={18} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
