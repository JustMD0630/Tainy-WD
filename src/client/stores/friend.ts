
import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export type Relationship = {
  id: string
  requesterId: string
  recipientId: string
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED'
  createdAt: number
  updatedAt: number
  user?: {
      id: string
      username: string
      avatar: string | null
      discriminator: string
  }
}

type FriendState = {
  friends: Relationship[]
  pending: Relationship[]
  sent: Relationship[]
  blocked: Relationship[]
  loading: boolean
  fetchFriends: () => Promise<void>
  sendRequest: (targetId: string) => Promise<boolean>
  acceptRequest: (requestId: string) => Promise<boolean>
  removeFriend: (relationshipId: string) => Promise<boolean>
  rejectRequest: (requestId: string) => Promise<boolean>
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  pending: [],
  sent: [],
  blocked: [],
  loading: false,

  fetchFriends: async () => {
    set({ loading: true })
    const res = await apiFetch<{
        success: boolean
        data: {
            friends: Relationship[]
            pending: Relationship[]
            sent: Relationship[]
            blocked: Relationship[]
        }
    }>('/v1/friendships')
    
    if (res.ok && res.data.success) {
        set({
            friends: res.data.data.friends,
            pending: res.data.data.pending,
            sent: res.data.data.sent,
            blocked: res.data.data.blocked,
            loading: false
        })
    } else {
        set({ loading: false })
    }
  },

  sendRequest: async (targetId: string) => {
    const res = await apiFetch('/v1/friendships/request', {
        method: 'POST',
        body: JSON.stringify({ targetId })
    })
    if (res.ok) {
        await get().fetchFriends()
        return true
    }
    return false
  },

  acceptRequest: async (requestId: string) => {
    // Ensure we are sending the correct ID
    console.log('Accepting request:', requestId)
    const res = await apiFetch(`/v1/friendships/requests/${requestId}/accept`, {
        method: 'POST',
        body: JSON.stringify({}) // Explicit empty body to avoid Fastify issues if Content-Type is set
    })
    if (res.ok) {
        await get().fetchFriends()
        return true
    }
    console.error('Failed to accept:', res.error)
    return false
  },

  rejectRequest: async (requestId: string) => {
    // Rejecting is basically deleting the relationship
    const res = await apiFetch(`/v1/friendships/${requestId}`, {
        method: 'DELETE'
        // No body needed for DELETE, and apiFetch now won't set Content-Type: json
    })
    if (res.ok) {
        await get().fetchFriends()
        return true
    }
    return false
  },

  removeFriend: async (relationshipId: string) => {
    const res = await apiFetch(`/v1/friendships/${relationshipId}`, {
        method: 'DELETE'
        // No body needed for DELETE
    })
    if (res.ok) {
        await get().fetchFriends()
        return true
    }
    return false
  }
}))
