import type { ReactNode } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, Typography } from '@mui/material'
import { Download, ExternalLink, X } from 'lucide-react'
import { OwnerChip } from '@/components/common/OwnerChip'
import { formatBytes, formatDateTime, formatMs } from '@/lib/format'
import { imageSrc, type GeneratedImage } from './api'

export function ImageDetailDialog({ image, onClose }: { image: GeneratedImage | null; onClose: () => void }) {
  return (
    <Dialog open={!!image} onClose={onClose} maxWidth="lg" fullWidth scroll="body">
      {image && (
        <>
          <IconButton onClick={onClose} aria-label="Tutup" sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}>
            <X size={18} />
          </IconButton>
          <DialogContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" sx={{ pt: 6 }}>
            <Box className="flex items-center justify-center overflow-hidden rounded-xl" sx={{ bgcolor: 'action.hover' }}>
              <img src={imageSrc(image)} alt={image.alt || image.prompt} className="max-h-[75vh] w-auto max-w-full object-contain" />
            </Box>
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatDateTime(image.created_at)}
                </Typography>
                <OwnerChip userId={image.user_id} />
              </div>
              <Info label="Prompt">{image.prompt}</Info>
              {image.revised_prompt && image.revised_prompt !== image.prompt && (
                <Info label="Prompt yang dipakai model">{image.revised_prompt}</Info>
              )}
              {image.alt && <Info label="Teks alt">{image.alt}</Info>}
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
                <Meta label="Model" value={image.model || '-'} mono />
                <Meta label="Ukuran file" value={formatBytes(image.size_bytes)} />
                <Meta label="Tipe" value={image.mime || '-'} />
                <Meta label="Lama dibuat" value={formatMs(image.latency_ms)} />
                <Meta label="File" value={image.file_name} mono />
              </dl>
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button startIcon={<ExternalLink size={16} />} href={imageSrc(image)} target="_blank" rel="noopener noreferrer">
              Buka di tab baru
            </Button>
            <Button variant="contained" startIcon={<Download size={16} />} href={imageSrc(image)} download={image.file_name}>
              Download
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" className="max-h-48 overflow-auto whitespace-pre-wrap">
        {children}
      </Typography>
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography component="dd" variant="body2" className={`break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </Typography>
    </>
  )
}
