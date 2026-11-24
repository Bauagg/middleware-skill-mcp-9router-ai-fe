import { createTheme } from '@mui/material/styles'

export function buildTheme(mode: 'light' | 'dark') {
  const isLight = mode === 'light'

  return createTheme({
    palette: {
      mode,
      primary: { main: '#4f46e5', light: '#818cf8', dark: '#3730a3' },
      secondary: { main: '#0ea5e9' },
      background: isLight
        ? { default: '#f6f7fb', paper: '#ffffff' }
        : { default: '#0b0d12', paper: '#12151c' },
      divider: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)',
      text: isLight ? { primary: '#0f172a', secondary: '#64748b' } : { primary: '#e2e8f0', secondary: '#94a3b8' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter Variable", system-ui, "Segoe UI", Roboto, sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.025em' },
      h2: { fontWeight: 700, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { sizeLarge: { minHeight: 46, fontSize: 15 } },
        variants: [
          {
            props: { variant: 'outlined', color: 'inherit' },
            style: ({ theme }) => ({ borderColor: theme.palette.divider }),
          },
        ],
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
            '&:hover:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.text.secondary,
            },
          }),
        },
      },
      MuiPaper: {
        styleOverrides: { outlined: ({ theme }) => ({ borderColor: theme.palette.divider }) },
      },
      MuiCard: {
        styleOverrides: { root: ({ theme }) => ({ borderColor: theme.palette.divider }) },
      },
    },
  })
}
