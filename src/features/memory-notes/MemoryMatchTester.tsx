import { useState } from 'react'
import { Alert, Button, Chip, LinearProgress, Paper, TextField, Typography } from '@mui/material'
import { Search } from 'lucide-react'
import { ErrorState } from '@/components/common/States'
import { formatNumber } from '@/lib/format'
import { useMemoryMatch } from './api'

/** Shows which notes would be injected for a given user message, without sending a chat. */
export function MemoryMatchTester() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const match = useMemoryMatch(q)
  const data = match.data

  return (
    <Paper variant="outlined" className="flex flex-col gap-3 p-4">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          setQ(input.trim())
        }}
      >
        <TextField
          size="small"
          fullWidth
          label="Pesan user"
          placeholder="mis. aku mau bikin promo diskon 50% lagi"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" variant="contained" startIcon={<Search size={16} />} disabled={!input.trim()} sx={{ flexShrink: 0 }}>
          Cocokkan
        </Button>
      </form>

      {match.isFetching && <LinearProgress />}
      {match.isError && <ErrorState error={match.error} onRetry={() => match.refetch()} />}

      {data &&
        (data.notes.length === 0 ? (
          <Alert severity="info">Tidak ada catatan yang cocok. Request untuk pesan ini berjalan tanpa catatan memori.</Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Chip size="small" label={`${data.notes.length} catatan disisipkan`} />
              <Chip size="small" variant="outlined" label={`± ${formatNumber(data.tokens_est)} token`} />
              {data.notes.map((n) => (
                <Chip key={n.id} size="small" variant="outlined" label={`${n.topic} · ${n.matched} kata cocok`} />
              ))}
            </div>
            <Typography
              component="pre"
              className="max-h-72 overflow-auto rounded-lg p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
              sx={{ bgcolor: 'action.hover' }}
            >
              {data.block}
            </Typography>
          </>
        ))}
    </Paper>
  )
}
