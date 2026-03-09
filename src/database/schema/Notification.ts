
export interface Notification {
  id: string
  userId: string
  type: 'warn' | 'info' | 'error' | 'success' | 'ban' | 'mute' | 'unban'
  title: string
  message: string
  read: boolean
  created: number
}
