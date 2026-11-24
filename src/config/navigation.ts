import {
  Brain,
  ChartColumn,
  FlaskConical,
  FolderGit2,
  Images,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Plug,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types/auth'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  description: string
  /** only shown to admins (the route is guarded too) */
  adminOnly?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    title: 'Utama',
    items: [
      {
        label: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        description: 'Status backend dan pintasan ke semua fitur.',
      },
      {
        label: 'Chat',
        path: '/chat',
        icon: MessageSquare,
        description: 'Uji chat lewat middleware dan lihat skill yang terpilih.',
      },
      {
        label: 'Galeri Gambar',
        // not /images: that path is the backend's image files (proxied in dev)
        path: '/gallery',
        icon: Images,
        description: 'Gambar yang dibuat lewat chat dengan tool generate_image.',
      },
    ],
  },
  {
    title: 'Pengetahuan',
    items: [
      {
        label: 'Skills',
        path: '/skills',
        icon: Sparkles,
        description: 'Daftar skill, upload zip, uji pemilihan skill, dan preview isi.',
      },
      {
        label: 'Context Packs',
        path: '/context-packs',
        icon: Layers,
        description: 'Fakta tetap yang selalu disisipkan ke setiap request.',
      },
      {
        label: 'Memory Notes',
        path: '/memory-notes',
        icon: Brain,
        description: 'Catatan pengalaman: konfirmasi, koreksi, atau tolak usulan.',
      },
    ],
  },
  {
    title: 'Integrasi',
    items: [
      {
        label: 'MCP',
        path: '/mcp',
        icon: Plug,
        description: 'Koneksi ke Canva, Figma, dan server MCP lain.',
      },
      {
        label: 'MCP dari GitHub',
        path: '/mcp-installs',
        icon: FolderGit2,
        description: 'Pasang repo GitHub sebagai MCP, lalu jalankan, hentikan, lihat log, atau hapus.',
      },
      {
        label: 'Persetujuan MCP',
        path: '/mcp-approvals',
        icon: ShieldCheck,
        description: 'Periksa lalu setujui atau tolak pemasangan MCP dari GitHub yang diajukan user.',
        adminOnly: true,
      },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      {
        label: 'Usage',
        path: '/usage',
        icon: ChartColumn,
        description: 'Log dan ringkasan pemakaian token per skill.',
      },
      {
        label: 'Evals',
        path: '/evals',
        icon: FlaskConical,
        description: 'Ukur apakah skill membuat jawaban lebih baik.',
      },
    ],
  },
]

export const navItems = navSections.flatMap((section) => section.items)

export function findNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) =>
    item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`),
  )
}

/** Menu as seen by a role: admin-only items are dropped for regular users. */
export function navSectionsFor(role: Role | undefined): NavSection[] {
  return navSections
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.adminOnly || role === 'admin') }))
    .filter((section) => section.items.length > 0)
}
