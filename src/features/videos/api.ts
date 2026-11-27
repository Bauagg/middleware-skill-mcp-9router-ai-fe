import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import type { PaginatedResponse } from '@/types/api'

/** One video made by the generate_video chat tool (t_generated_videos). */
export interface GeneratedVideo {
  id: string
  user_id: string
  /** absolute BASE_URL/videos/<file_name>, served without auth */
  url: string
  file_name: string
  prompt: string
  /** name of the provider and the account that made it */
  provider: string
  account: string
  size_bytes: number
  latency_ms: number
  created_at: string
}

export interface VideoFilter {
  q?: string
  page: number
  limit: number
}

export const videoKeys = {
  all: ['videos'] as const,
  list: (f: VideoFilter) => [...videoKeys.all, 'list', f] as const,
}

/** Newest first. Admins get every user's videos. */
export function useVideos(filter: VideoFilter) {
  return useQuery({
    queryKey: videoKeys.list(filter),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<GeneratedVideo>>('/videos', {
        params: { q: filter.q || undefined, page: filter.page, limit: filter.limit },
      })
      return { videos: res.data.data, meta: res.data.meta }
    },
    placeholderData: keepPreviousData,
  })
}

/** Same rule as images: in development the file goes through the dev proxy at /videos/<file_name>. */
export const videoSrc = (v: GeneratedVideo) => (import.meta.env.DEV ? `/videos/${v.file_name}` : v.url)
