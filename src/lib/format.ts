const dateTimeFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })
const numberFmt = new Intl.NumberFormat('id-ID')
const decimalFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })
const scoreFmt = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })

export function formatDateTime(value?: string | null): string {
  return value ? dateTimeFmt.format(new Date(value)) : '-'
}

export function formatDate(value?: string | null): string {
  return value ? dateFmt.format(new Date(value)) : '-'
}

export function formatNumber(value?: number | null): string {
  return value == null ? '-' : numberFmt.format(Math.round(value))
}

export function formatDecimal(value?: number | null): string {
  return value == null ? '-' : decimalFmt.format(value)
}

export function formatScore(value?: number | null): string {
  return value == null ? '-' : scoreFmt.format(value)
}

export function formatMs(value?: number | null): string {
  if (value == null) return '-'
  return value >= 1000 ? `${decimalFmt.format(value / 1000)} dtk` : `${numberFmt.format(Math.round(value))} ms`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${decimalFmt.format(bytes / 1024)} KB`
  return `${decimalFmt.format(bytes / 1024 / 1024)} MB`
}

/** Same rough estimate the backend uses: characters / 4. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/** YYYY-MM-DD in local time, for <input type="date"> and the usage summary filter. */
export function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
