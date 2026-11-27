/**
 * Files attached to a chat message. Images go to the model as `image_url` parts (it must support
 * vision); documents go as OpenAI `file` parts, which the middleware turns into text before the
 * request reaches 9Router.
 */

export interface Attachment {
  id: string
  name: string
  kind: 'image' | 'file'
  mime: string
  size: number
  /** data:<mime>;base64,... */
  dataUrl: string
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } }

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif']
const FILE_EXT = ['pdf', 'doc', 'docx', 'xlsx', 'xlsm', 'pptx', 'csv', 'tsv', 'txt', 'md', 'json']

/** `accept` for the file input. */
export const ACCEPT = [...IMAGE_EXT, ...FILE_EXT].map((e) => '.' + e).join(',')

export const MAX_FILE_BYTES = 10 << 20
export const MAX_TOTAL_BYTES = 25 << 20
export const MAX_FILES = 10

/** Images wider or taller than this are scaled down before sending (fewer tokens, smaller request). */
const MAX_IMAGE_SIDE = 2048

const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''

/** Why this file can't be attached, or null when it can. */
export function rejectReason(file: File): string | null {
  const e = ext(file.name)
  if (!IMAGE_EXT.includes(e) && !FILE_EXT.includes(e) && !file.type.startsWith('image/')) {
    return e === 'xls'
      ? `${file.name}: Excel lama (.xls) belum didukung, simpan sebagai .xlsx`
      : `${file.name}: jenis file tidak didukung`
  }
  if (file.size > MAX_FILE_BYTES) return `${file.name}: lebih dari ${MAX_FILE_BYTES >> 20} MB`
  return null
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error ?? new Error('file tidak bisa dibaca'))
    r.readAsDataURL(blob)
  })
}

/** Scale a large photo down to MAX_IMAGE_SIDE (JPEG/WebP/PNG keep their type; GIF is left alone). */
async function shrinkImage(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), type, 0.9))
}

export async function readAttachment(file: File): Promise<Attachment> {
  const isImage = file.type.startsWith('image/') || IMAGE_EXT.includes(ext(file.name))
  const blob = isImage ? await shrinkImage(file) : file
  return {
    id: crypto.randomUUID(),
    name: file.name || (isImage ? 'gambar.png' : 'file'),
    kind: isImage ? 'image' : 'file',
    mime: blob.type || file.type,
    size: blob.size,
    dataUrl: await readDataUrl(blob),
  }
}

/** Message content: plain text, or parts when there are attachments. */
export function toContent(text: string, attachments: Attachment[] | undefined): string | ContentPart[] {
  if (!attachments?.length) return text
  const parts: ContentPart[] = []
  if (text) parts.push({ type: 'text', text })
  for (const a of attachments) {
    parts.push(
      a.kind === 'image'
        ? { type: 'image_url', image_url: { url: a.dataUrl } }
        : { type: 'file', file: { filename: a.name, file_data: a.dataUrl } },
    )
  }
  return parts
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1 << 20) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1 << 20)).toFixed(1)} MB`
}
