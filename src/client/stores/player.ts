import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export type Requester = {
  id: string
  username: string
  globalName: string | null
  defaultAvatarURL: string | null
}

export type Track = {
  id?: string
  title: string
  uri: string
  length: number
  thumbnail: string
  author: string
  requester: Requester | null
}

export type PlayerStatus = {
  guildId: string
  loop: string
  pause: boolean
  volume: number
  member: string
  position: number
  voiceChannel?: string
  voiceChannelName?: string | null
  current: Track | null
  queue: Track[]
}

type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type PlayerState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  wsStatus: WsStatus
  guildId: string
  userId: string
  data: PlayerStatus | null
  lastEvent: any | null
  error: string | null
  setContext: (guildId: string, userId: string) => void
  refresh: (silent?: boolean) => Promise<void>
  connectWs: () => void
  disconnectWs: () => void
  control: (payload: Record<string, any>) => Promise<boolean>
  createPlayer: () => Promise<boolean>
  destroyPlayer: () => Promise<boolean>
}
let ws: WebSocket | null = null
let wsManualClose = false
let reconnectTimeout: NodeJS.Timeout | null = null

function wsUrl(guildId: string) {
  const token = localStorage.getItem('discord_token')
  
  // Support custom backend URL via env var (e.g., for dev mode)
  // If VITE_API_URL is set (e.g. http://localhost:3000), use it to derive WS URL
  const apiBase = import.meta.env.VITE_API_URL || ''
  
  let host = window.location.host
  let proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  if (apiBase) {
    try {
      const url = new URL(apiBase)
      host = url.host
      proto = url.protocol === 'https:' ? 'wss:' : 'ws:'
    } catch (e) {
      console.error('[WS] Invalid VITE_API_URL', e)
    }
  }

  // Ensure token has Bearer prefix for server validation
  const authorization = token ? `Bearer ${token}` : ''
  return `${proto}//${host}/v1/websocket?guildId=${encodeURIComponent(guildId)}&authorization=${encodeURIComponent(authorization)}`
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  status: 'idle',
  wsStatus: 'disconnected',
  guildId: '',
  userId: '',
  data: null,
  lastEvent: null,
  error: null,
  setContext: (guildId, userId) => set({ guildId, userId }),
  refresh: async (silent = false) => {
    const { guildId } = get()
    if (!guildId) {
      set({ status: 'ready', data: null, error: null })
      return
    }
    const token = localStorage.getItem('discord_token')
    if (!silent) set({ status: 'loading', error: null })
    
    const r = await apiFetch<PlayerStatus>(`/v1/players/${encodeURIComponent(guildId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.ok === false) {
      if (r.status === 404) {
        set({ status: 'ready', data: null, error: null })
        return
      }
      set({ status: 'error', error: r.error })
      return
    }
    set({ status: 'ready', data: r.data, error: null })
  },
  connectWs: () => {
    const { guildId } = get()
    if (!guildId) return
    
    // Clear any pending reconnect
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
    }

    // Prevent reconnect loop if already connected or connecting
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    
    // Simple debounce to prevent rapid reconnects
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
    }

    set({ wsStatus: 'connecting' })
    wsManualClose = false
    ws = new WebSocket(wsUrl(guildId))

    ws.onopen = () => {
      console.log('[WS] Connected')
      set({ wsStatus: 'connected' })
    }

    ws.onclose = (ev) => {
      // If manual close, do nothing
      if (wsManualClose) {
        set({ wsStatus: 'disconnected' })
        ws = null
        return
      }
      
      console.log('[WS] Disconnected', ev.code)
      set({ wsStatus: 'disconnected' })
      ws = null
      
      // Auto-reconnect logic with exponential backoff protection
      if (!wsManualClose) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout)
          reconnectTimeout = setTimeout(() => {
              get().connectWs()
          }, 5000) // Increased to 5s to be safer
      }
    }

    ws.onerror = (err) => {
      // Silent error logging to avoid console spam
      // console.error('[WS] Error', err)
      set({ wsStatus: 'error' })
      // Don't close here, let onclose handle it
    }

    ws.onmessage = (ev) => {
      let msg: any = null
      try {
        msg = JSON.parse(String(ev.data))
      } catch {
        return
      }
      set({ lastEvent: msg })
      if (msg?.op === 'playerUpdate' && typeof msg?.position === 'number') {
        set((s) => ({
          data: s.data ? { ...s.data, position: msg.position } : s.data,
        }))
        return
      }
      if (msg?.op === 'trackStart') {
        set((s) => ({
          data: s.data ? { ...s.data, current: msg.data ?? null, position: 0 } : s.data,
        }))
        get().refresh()
        return
      }
      if (msg?.op === 'playerEnd') {
        get().refresh()
        return
      }
      if (msg?.op === 'playerPause') {
        set((s) => ({
          data: s.data ? { ...s.data, pause: true } : s.data,
        }))
        get().refresh() // Refresh to ensure sync
        return
      }
      if (msg?.op === 'playerResume') {
        set((s) => ({
          data: s.data ? { ...s.data, pause: false } : s.data,
        }))
        get().refresh() // Refresh to ensure sync
        return
      }
      if (msg?.op === 'playerCreate' || msg?.op === 'playerDestroy') {
        get().refresh()
        return
      }
    }
  },
  disconnectWs: () => {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
    }
    if (ws) {
      try {
        wsManualClose = true
        ws.close()
      } catch {}
    }
    ws = null
    set({ wsStatus: 'disconnected' })
  },
  control: async (payload) => {
    const { guildId } = get()
    if (!guildId) return false
    const token = localStorage.getItem('discord_token')
    
    // First check if player exists in store state? No, always try server.
    
    const r = await apiFetch<any>(`/v1/players/${encodeURIComponent(guildId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (r.ok === false) {
      // 404 means player not found, so we return false to let caller handle creation
      if (r.status === 404) return false
      
      set({ error: r.error })
      return false
    }
    
    // If we added tracks, refresh state
    if (payload.add || payload.skipMode || payload.loop || payload.pause !== undefined) {
        get().refresh()
    }
    
    return true
  },
  createPlayer: async () => {
    const { guildId, userId } = get()
    if (!guildId || !userId) return false
    const token = localStorage.getItem('discord_token')
    // Ruta correcta: /v1/players (POST)
    const r = await apiFetch<any>('/v1/players', {
      method: 'POST',
      body: JSON.stringify({ guildId, userId }),
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.ok === false) {
      set({ error: r.error })
      return false
    }
    await get().refresh()
    return true
  },
  destroyPlayer: async () => {
    const { guildId } = get()
    if (!guildId) return false
    const token = localStorage.getItem('discord_token')
    // Ruta correcta: /v1/players/:guildId (DELETE)
    const r = await apiFetch<any>(`/v1/players/${encodeURIComponent(guildId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (r.ok === false && r.status !== 204) {
      set({ error: r.error })
      return false
    }
    await get().refresh()
    return true
  },
}))
