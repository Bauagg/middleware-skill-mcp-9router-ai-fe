import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'

/** One image made by the generate_image chat tool (t_generated_images). */
export interface GeneratedImage {
  id: string
  user_id: string
  /** absolute BASE_URL/images/<file_name>, served without auth */
  url: string
  file_name: string
  prompt: string
  revised_prompt: string
  alt: string
  model: string
  mime: string
  size_bytes: number
  latency_ms: number
  created_at: string
}

export interface ImageFilter {
  q?: string
  page: number
  limit: number
}

export const imageKeys = {
  all: ['images'] as const,
  list: (f: ImageFilter) => [...imageKeys.all, 'list', f] as const,
}

/** Newest first. Admins get every user's images. */
export function useImages(filter: ImageFilter) {
  return useQuery({
    queryKey: imageKeys.list(filter),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<GeneratedImage>>('/images', {
        params: { q: filter.q || undefined, page: filter.page, limit: filter.limit },
      })
      return { images: res.data.data, meta: res.data.meta }
    },
    placeholderData: keepPreviousData,
  })
}

/**
 * Where the browser loads the file from. The backend links to BASE_URL; in development the same
 * file is reachable through the dev proxy at /images/<file_name>, which also works when BASE_URL
 * isn't reachable from this machine.
 */
export const imageSrc = (img: GeneratedImage) => (import.meta.env.DEV ? `/images/${img.file_name}` : img.url)
