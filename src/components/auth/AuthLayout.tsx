import { forwardRef, useState, type ReactNode } from 'react'
import { Box, IconButton, InputAdornment, TextField, Typography, type TextFieldProps } from '@mui/material'
import { Bot, Brain, Eye, EyeOff, Layers, Lock, Plug, Sparkles } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

/** Split layout for the login and register pages: product panel on the left, form on the right. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Box className="grid min-h-full lg:grid-cols-[1.1fr_1fr]" sx={{ bgcolor: 'background.default' }}>
      <BrandPanel />

      <Box className="flex items-center justify-center px-5 py-10 sm:px-10">
        <Box className="w-full max-w-95">
          <Box className="mb-10 flex items-center gap-2.5 lg:hidden">
            <LogoMark />
            <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Middleware AI</Typography>
          </Box>

          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 26, sm: 30 } }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1, mb: 4 }}>{subtitle}</Typography>

          {children}
        </Box>
      </Box>
    </Box>
  )
}

/** Label above the input, matching the auth form style. */
export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Typography component="label" htmlFor={htmlFor} sx={{ fontSize: 14, fontWeight: 600 }}>
        {label}
      </Typography>
      {children}
    </div>
  )
}

/** Password input with a lock icon and a show/hide toggle. Works with react-hook-form's register(). */
export const PasswordField = forwardRef<HTMLInputElement, TextFieldProps>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false)
  return (
    <TextField
      {...props}
      inputRef={ref}
      type={show ? 'text' : 'password'}
      fullWidth
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Lock size={18} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                size="small"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
})

export function LogoMark() {
  return (
    <Box
      className="grid size-9 shrink-0 place-items-center rounded-[10px]"
      sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
    >
      <Bot size={20} />
    </Box>
  )
}

const injected = [
  { icon: Sparkles, label: 'Skill', value: 'founder-pricing' },
  { icon: Layers, label: 'Context pack', value: 'bisnis' },
  { icon: Brain, label: 'Memori', value: '2 catatan cocok' },
  { icon: Plug, label: 'MCP', value: 'Canva' },
]

/** Dark product panel shown on large screens. */
function BrandPanel() {
  return (
    <Box
      className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
      sx={{ bgcolor: '#0b0f1c', color: '#e2e8f0', p: 6 }}
    >
      {/* soft glows */}
      <Box
        aria-hidden
        className="pointer-events-none absolute inset-0"
        sx={{
          background:
            'radial-gradient(520px circle at 15% 0%, rgba(99,102,241,0.32), transparent 60%), radial-gradient(480px circle at 100% 100%, rgba(14,165,233,0.22), transparent 60%)',
        }}
      />
      {/* faint grid */}
      <Box
        aria-hidden
        className="pointer-events-none absolute inset-0"
        sx={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent)',
        }}
      />

      <Box className="relative flex items-center gap-2.5">
        <LogoMark />
        <Typography sx={{ fontWeight: 700, fontSize: 17 }}>Middleware AI</Typography>
      </Box>

      <Box className="relative max-w-115">
        <Typography
          component="p"
          sx={{ fontSize: 38, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.025em', color: '#fff' }}
        >
          Setiap chat dibekali konteks yang tepat.
        </Typography>
        <Typography sx={{ mt: 2, color: 'rgba(226,232,240,0.7)', lineHeight: 1.65 }}>
          Middleware memilih skill, menyisipkan context pack dan catatan memori, lalu meneruskan request ke
          9Router milikmu.
        </Typography>

        {/* request preview */}
        <Box
          className="mt-10 rounded-2xl border p-5"
          sx={{ borderColor: 'rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}
        >
          <Box className="flex justify-end">
            <Box
              className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5"
              sx={{ bgcolor: 'primary.main', color: '#fff', fontSize: 14 }}
            >
              Berapa harga yang pas untuk kopi susu literan?
            </Box>
          </Box>

          <Typography
            sx={{
              mt: 2.5,
              mb: 1.5,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(226,232,240,0.5)',
            }}
          >
            Disisipkan middleware
          </Typography>

          <div className="grid grid-cols-2 gap-2">
            {injected.map(({ icon: Icon, label, value }) => (
              <Box
                key={label}
                className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                sx={{ borderColor: 'rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.03)' }}
              >
                <Box sx={{ color: 'primary.light' }} className="flex">
                  <Icon size={16} />
                </Box>
                <div className="min-w-0">
                  <Typography sx={{ fontSize: 11, color: 'rgba(226,232,240,0.5)', lineHeight: 1.3 }}>{label}</Typography>
                  <Typography noWrap sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>
                    {value}
                  </Typography>
                </div>
              </Box>
            ))}
          </div>
        </Box>
      </Box>

      <Typography className="relative" sx={{ fontSize: 12, color: 'rgba(226,232,240,0.45)' }}>
        © {CURRENT_YEAR} Middleware AI
      </Typography>
    </Box>
  )
}
