import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, CircularProgress, InputAdornment, Link, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, Field, PasswordField } from '@/components/auth/AuthLayout'
import { registerRequest, registerSchema, type RegisterInput } from '@/features/auth/api'
import { getErrorMessage } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

/**
 * Self-service sign-up. The backend always creates role "user" here;
 * admin accounts are set up on the backend (ADMIN_EMAIL/ADMIN_PASSWORD), not from this page.
 */
export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const signup = useMutation({
    mutationFn: registerRequest,
    meta: { silent: true },
    // register returns tokens right away, so the user is logged in
    onSuccess: (result) => {
      setSession(result)
      navigate(from, { replace: true })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  return (
    <AuthLayout title="Buat akun" subtitle="Daftar untuk mulai memakai middleware dengan 9Router milikmu sendiri.">
      {signup.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {getErrorMessage(signup.error)}
        </Alert>
      )}

      <form onSubmit={handleSubmit((values) => signup.mutate(values))} noValidate className="flex flex-col gap-5">
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
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message ?? '8–72 karakter'}
          />
        </Field>

        <Field label="Ulangi password" htmlFor="confirmPassword">
          <PasswordField
            id="confirmPassword"
            placeholder="Ketik ulang password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
        </Field>

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={signup.isPending}
          endIcon={signup.isPending ? <CircularProgress size={16} color="inherit" /> : <ArrowRight size={18} />}
          sx={{ mt: 1 }}
        >
          {signup.isPending ? 'Memproses' : 'Daftar'}
        </Button>
      </form>

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 4, textAlign: 'center' }}>
        Sudah punya akun?{' '}
        <Link component={RouterLink} to="/login" state={location.state} sx={{ fontWeight: 600 }}>
          Masuk
        </Link>
      </Typography>
    </AuthLayout>
  )
}
