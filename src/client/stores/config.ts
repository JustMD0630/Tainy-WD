import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export type BotConfig = {
  botBaseUrl: string
  botAuthToken: string
  botWsUrl?: string
  defaultGuildId: string
  defaultUserId: string
  botOwnerId: string
  botAdmins: string[]
}

type ConfigState = {
  status: 'idle' | 'loading' | 'ready'
  config: BotConfig
  error: string | null
  load: () => Promise<void>
  save: (next: Partial<BotConfig>) => Promise<boolean>
  test: () => Promise<{ ok: boolean; detail: string }>
}

const EMPTY: BotConfig = {
  botBaseUrl: '',
  botAuthToken: '',
  botWsUrl: '',
  defaultGuildId: '',
  defaultUserId: '',
  botOwnerId: '',
  botAdmins: [],
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  status: 'idle',
  config: EMPTY,
  error: null,
  load: async () => {
    set({ status: 'loading', error: null })
    const r = await apiFetch<{ success: boolean; config: BotConfig }>('/api/config', {
      method: 'GET',
    })
    if (r.ok === false) {
      set({ status: 'ready', error: r.error })
      return
    }
    set({ status: 'ready', config: r.data.config, error: null })
  },
  save: async (next) => {
    set({ error: null })
    const r = await apiFetch<{ success: boolean; config: BotConfig }>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(next),
    })
    if (r.ok === false) {
      set({ error: r.error })
      return false
    }
    set({ config: r.data.config })
    return true
  },
  test: async () => {
    const r = await apiFetch<{ success: boolean; status: number; body: string; error?: string }>(
      '/api/bot/health',
      { method: 'GET' }
    )
    if (r.ok === false) return { ok: false, detail: r.error }
    return { ok: !!r.data.success, detail: `status=${r.data.status}` }
  },
}))
