import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export type BotInfo = {
  id: string
  username: string
  avatar: string
}

type BotState = {
  info: BotInfo | null
  fetchInfo: () => Promise<void>
}

export const useBotStore = create<BotState>((set) => ({
  info: null,
  fetchInfo: async () => {
    const r = await apiFetch<BotInfo>('/v1/bot/info')
    if (r.ok) {
      set({ info: r.data })
    }
  },
}))
