import { create } from 'zustand'

export type User = {
  id: string
  username: string
  discriminator: string
  avatar: string
  bot?: boolean
  system?: boolean
  mfa_enabled?: boolean
  banner?: string
  accent_color?: number
  locale?: string
  verified?: boolean
  email?: string
  flags?: number
  premium_type?: number
  public_flags?: number
  banLevel?: number
  banReason?: string
  banExpires?: number
  dashboardLanguage?: string
  created?: number
  bio?: string
  profileColor?: string
  isPremium?: boolean
  isOwner?: boolean
  isAdmin?: boolean
  premiumPlan?: string
  socials?: {
    twitter?: string
    instagram?: string
    website?: string
    github?: string
  }
}

type AuthState = {
  token: string | null
  user: User | null
  status: 'loading' | 'authenticated' | 'anonymous'
  setToken: (token: string) => void
  fetchUser: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('discord_token'),
  user: null,
  status: 'loading',

  setToken: (token: string) => {
    localStorage.setItem('discord_token', token)
    set({ token, status: 'loading' })
    get().fetchUser()
  },

  fetchUser: async () => {
    const { token } = get()
    if (!token) {
      set({ status: 'anonymous', user: null })
      return
    }

    try {
      const res = await fetch('/v1/auth/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch user')
      }

      const user = await res.json()
      set({ user, status: 'authenticated' })
    } catch (err) {
      localStorage.removeItem('discord_token')
      set({ token: null, status: 'anonymous', user: null })
    }
  },

  logout: () => {
    localStorage.removeItem('discord_token')
    set({ token: null, status: 'anonymous', user: null })
  },
}))
