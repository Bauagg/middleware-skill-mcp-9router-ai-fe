import { Button, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center' }} className="py-24 text-center">
      <Typography variant="h3" sx={{ fontWeight: 700 }}>
        404
      </Typography>
      <Typography sx={{ color: 'text.secondary' }}>Page not found.</Typography>
      <Button component={Link} to="/" variant="outlined">
        Back home
      </Button>
    </Stack>
  )
}
