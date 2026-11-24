import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, CircularProgress, InputAdornment, Link, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, Field, PasswordField } from '@/components/auth/AuthLayout'
import { loginRequest, loginSchema, type LoginInput } from '@/features/auth/api'
import { getErrorMessage } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const login = useMutation({
    mutationFn: loginRequest,
    // shown inline below, not as a toast
    meta: { silent: true },
    onSuccess: (result) => {
      setSession(result)
      navigate(from, { replace: true })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <AuthLayout title="Selamat datang kembali" subtitle="Masuk untuk mengelola skill, memori, dan integrasi middleware kamu.">
      {login.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {getErrorMessage(login.error)}
        </Alert>
      )}

      <form onSubmit={handleSubmit((values) => login.mutate(values))} noValidate className="flex flex-col gap-5">
        <Field label="Email" htmlFor="email">
          <TextField
            id="email"
            type="email"
            placeholder="nama@perusahaan.com"
            autoComplete="email"
            autoFocus
            fullWidth
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={18} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <PasswordField
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
        </Field>

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={login.isPending}
          endIcon={login.isPending ? <CircularProgress size={16} color="inherit" /> : <ArrowRight size={18} />}
          sx={{ mt: 1 }}
        >
          {login.isPending ? 'Memproses' : 'Masuk'}
        </Button>
      </form>

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 4, textAlign: 'center' }}>
        Belum punya akun?{' '}
        <Link component={RouterLink} to="/register" state={location.state} sx={{ fontWeight: 600 }}>
          Daftar
        </Link>
      </Typography>
    </AuthLayout>
  )
}
