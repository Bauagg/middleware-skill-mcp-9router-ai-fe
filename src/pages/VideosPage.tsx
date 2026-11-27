import { useState } from 'react'
import { Box, InputAdornment, LinearProgress, Pagination, Paper, TextField, Typography } from '@mui/material'
import { Clapperboard, Search, VideoOff } from 'lucide-react'
import { OwnerChip } from '@/components/common/OwnerChip'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import { useVideos, videoSrc, type GeneratedVideo } from '@/features/videos/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatBytes, formatDateTime, formatMs } from '@/lib/format'
import { useIsAdmin } from '@/stores/authStore'

const PAGE_SIZE = 12

export function VideosPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebouncedValue(search.trim())
  const videos = useVideos({ q, page, limit: PAGE_SIZE })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description={
          isAdmin
            ? 'Video yang dibuat lewat chat (tool generate_video, lewat akun AI masing-masing user) oleh semua user.'
            : 'Video yang kamu buat lewat chat, mis. "buatkan video kucing oranye main bola".'
        }
      />

      <TextField
        size="small"
        placeholder="Cari di prompt"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        sx={{ maxWidth: 420 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          },
        }}
      />

      {videos.isFetching && !videos.isPending && <LinearProgress />}

      {videos.isPending ? (
        <LoadingState />
      ) : videos.isError ? (
        <ErrorState error={videos.error} onRetry={() => videos.refetch()} />
      ) : videos.data.videos.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title={q ? 'Tidak ada video yang cocok' : 'Belum ada video'}
          description={
            q
              ? undefined
              : 'Minta video lewat Chat, mis. "buatkan video ombak di pantai saat senja". Butuh akun AI yang mendukung video (mis. Gemini) di halaman Akun AI.'
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {videos.data.videos.map((v) => (
              <Paper key={v.id} variant="outlined" className="overflow-hidden">
                <Player video={v} />
                <div className="flex flex-col gap-1 p-3">
                  <Typography variant="body2" className="line-clamp-3" title={v.prompt}>
                    {v.prompt}
                  </Typography>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} className="mr-auto">
                      {formatDateTime(v.created_at)} · {formatBytes(v.size_bytes)} · {formatMs(v.latency_ms)}
                    </Typography>
                    <OwnerChip userId={v.user_id} />
                  </div>
                </div>
              </Paper>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {videos.data.meta.total} video
            </Typography>
            {videos.data.meta.total_pages > 1 && (
              <Pagination count={videos.data.meta.total_pages} page={page} onChange={(_, p) => setPage(p)} shape="rounded" />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** 16:9 player; files deleted on the server show a placeholder instead of a broken player. */
function Player({ video }: { video: GeneratedVideo }) {
  const [failed, setFailed] = useState(false)
  return (
    <Box className="flex aspect-video w-full items-center justify-center" sx={{ bgcolor: 'common.black' }}>
      {failed ? (
        <div className="flex flex-col items-center gap-1 text-white opacity-60">
          <VideoOff size={24} />
          <Typography variant="caption">File tidak tersedia</Typography>
        </div>
      ) : (
        <video
          src={videoSrc(video)}
          controls
          preload="metadata"
          onError={() => setFailed(true)}
          className="h-full w-full"
          aria-label={video.prompt}
        />
      )}
    </Box>
  )
}
