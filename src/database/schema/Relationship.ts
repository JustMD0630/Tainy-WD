
export interface Relationship {
  id: string
  requesterId: string
  recipientId: string
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED'
  createdAt: number
  updatedAt: number
}
