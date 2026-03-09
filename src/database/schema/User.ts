
export interface UserData {
  id: string
  banned: boolean
  muted: boolean
  mutedUntil?: number
  warns: number
  created: number
  // New Ban System
  banLevel?: number // 1: Restricted, 2: Web Ban, 3: Full Ban
  banReason?: string
  banExpires?: number
  dashboardLanguage?: string
  // Profile
  bio?: string
  banner?: string
  profileColor?: string
  socials?: {
    twitter?: string
    instagram?: string
    website?: string
    github?: string
  }
}
