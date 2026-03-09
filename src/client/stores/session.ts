import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

type SessionUser = {
  id: string
  role: 'admin'
}

type SessionState = {
  status: SessionStatus
  user: SessionUser | null
  error: string | null
  refresh: () => Promise<void>
  login: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'loading',
  user: null,
  error: null,
  refresh: async () => {
    set({ status: 'loading', error: null })
    const r = await apiFetch<{ success: boolean; user: SessionUser | null }>('/api/auth/me', {
      method: 'GET',
    })
    if (r.ok === false) {
      set({ status: 'anonymous', user: null, error: r.error })
      return
    }
    if (r.data.user) set({ status: 'authenticated', user: r.data.user, error: null })
    else set({ status: 'anonymous', user: null, error: null })
  },
  login: async (password: string) => {
    set({ error: null })
    const r = await apiFetch<{ success: boolean; user?: SessionUser; error?: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    )
    if (r.ok === false) {
      set({ status: 'anonymous', user: null, error: r.error })
      return false
    }
    await get().refresh()
    return true
  },
  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) })
    set({ status: 'anonymous', user: null, error: null })
  },
}))
