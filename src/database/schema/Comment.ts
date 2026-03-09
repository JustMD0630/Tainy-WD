export interface Comment {
  id: string
  playlistId: string
  userId: string
  content: string
  created: number
  updated?: number
  reportCount?: number
  hidden?: boolean
}
