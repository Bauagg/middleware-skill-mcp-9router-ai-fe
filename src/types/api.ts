/** Response envelope used by every backend `/api/*` endpoint. */
export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error'
  message: string
  data: T
  errors?: ApiFieldError[]
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta
}
