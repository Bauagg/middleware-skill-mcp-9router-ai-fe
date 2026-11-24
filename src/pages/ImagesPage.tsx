import { useState } from 'react'
import {
  Box,
  ButtonBase,
  InputAdornment,
  LinearProgress,
  Pagination,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Images, ImageOff, Search } from 'lucide-react'
import { OwnerChip } from '@/components/common/OwnerChip'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States'
import { imageSrc, useImages, type GeneratedImage } from '@/features/images/api'
import { ImageDetailDialog } from '@/features/images/ImageDetailDialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDateTime } from '@/lib/format'
import { useIsAdmin } from '@/stores/authStore'

const PAGE_SIZE = 24

export function ImagesPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebouncedValue(search.trim())
  const images = useImages({ q, page, limit: PAGE_SIZE })
  const [selected, setSelected] = useState<GeneratedImage | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description={
          isAdmin
            ? 'Gambar yang dibuat lewat chat (tool generate_image) oleh semua user.'
            : 'Gambar yang kamu buat lewat chat, mis. "buatkan gambar logo kedai kopi".'
        }
      />

      <TextField
        size="small"
        placeholder="Cari di prompt atau teks alt"
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

      {images.isFetching && !images.isPending && <LinearProgress />}

      {images.isPending ? (
        <LoadingState />
      ) : images.isError ? (
        <ErrorState error={images.error} onRetry={() => images.refetch()} />
      ) : images.data.images.length === 0 ? (
        <EmptyState
          icon={Images}
          title={q ? 'Tidak ada gambar yang cocok' : 'Belum ada gambar'}
          description={q ? undefined : 'Minta gambar lewat Chat, mis. "buatkan gambar poster promo kopi". Hasilnya tersimpan di sini.'}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {images.data.images.map((img) => (
              <Paper key={img.id} variant="outlined" className="overflow-hidden">
                <ButtonBase onClick={() => setSelected(img)} className="block! w-full text-left" aria-label={`Lihat ${img.alt || img.prompt}`}>
                  <Thumb image={img} />
                </ButtonBase>
                <div className="flex flex-col gap-1 p-3">
                  <Typography variant="body2" className="line-clamp-2" title={img.prompt}>
                    {img.alt || img.prompt}
                  </Typography>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} className="mr-auto">
                      {formatDateTime(img.created_at)}
                    </Typography>
                    <OwnerChip userId={img.user_id} />
                  </div>
                </div>
              </Paper>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {images.data.meta.total} gambar
            </Typography>
            {images.data.meta.total_pages > 1 && (
              <Pagination count={images.data.meta.total_pages} page={page} onChange={(_, p) => setPage(p)} shape="rounded" />
            )}
          </div>
        </>
      )}

      <ImageDetailDialog image={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

/** Square preview; files deleted on the server show a placeholder instead of a broken image. */
function Thumb({ image }: { image: GeneratedImage }) {
  const [failed, setFailed] = useState(false)
  return (
    <Box className="flex aspect-square w-full items-center justify-center" sx={{ bgcolor: 'action.hover' }}>
      {failed ? (
        <div className="flex flex-col items-center gap-1 opacity-60">
          <ImageOff size={24} />
          <Typography variant="caption">File tidak tersedia</Typography>
        </div>
      ) : (
        <img
          src={imageSrc(image)}
          alt={image.alt || image.prompt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </Box>
  )
}
