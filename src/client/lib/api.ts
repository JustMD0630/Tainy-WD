import { useAuthStore } from '../stores/auth'

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const token = useAuthStore.getState().token
    
    const headers = new Headers(init?.headers)
    
    // Only set Content-Type: application/json if there is a body and it's not FormData
    // Fastify throws FST_ERR_CTP_EMPTY_JSON_BODY if Content-Type is json but body is empty
    const hasBody = init?.body !== undefined && init?.body !== null
    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
    
    if (hasBody && !isFormData && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const res = await fetch(input, {
      credentials: 'include',
      ...init,
      headers,
    })
    const text = await res.text()
    const json = text.length ? (JSON.parse(text) as T) : (null as T)
    if (!res.ok) {
      const errMsg = (json as any)?.error || (json as any)?.message || `HTTP ${res.status}`
      return { ok: false, error: String(errMsg), status: res.status }
    }
    return { ok: true, data: json }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}
