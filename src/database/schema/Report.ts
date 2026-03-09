export interface Report {
  id: string
  commentId: string
  reporterId: string
  reason: string
  created: number
  status: 'pending' | 'resolved' | 'dismissed'
}
