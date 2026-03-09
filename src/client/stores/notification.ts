import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

export type Notification = {
    id: string
    type: 'warn' | 'info' | 'error' | 'success'
    title: string
    message: string
    read: boolean
    created: number
}

interface NotificationState {
    notifications: Notification[]
    unreadCount: number
    fetchNotifications: (userId: string) => Promise<void>
    markAsRead: (userId: string) => Promise<void>
    deleteNotification: (id: string, userId: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    fetchNotifications: async (userId: string) => {
        const r = await apiFetch<{ notifications: Notification[] }>(`/v1/notifications?userId=${userId}`)
        if (r.ok) {
            const sorted = r.data.notifications.sort((a, b) => b.created - a.created)
            set({ 
                notifications: sorted,
                unreadCount: sorted.filter(n => !n.read).length
            })
        }
    },
    markAsRead: async (userId: string) => {
        const r = await apiFetch('/v1/notifications/read', {
            method: 'POST',
            body: JSON.stringify({ userId })
        })
        if (r.ok) {
            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, read: true })),
                unreadCount: 0
            }))
        }
    },
    deleteNotification: async (id: string, userId: string) => {
        // Optimistic update
        set(state => {
            const newNotes = state.notifications.filter(n => n.id !== id)
            return {
                notifications: newNotes,
                unreadCount: newNotes.filter(n => !n.read).length
            }
        })

        await apiFetch(`/v1/notifications/${id}?userId=${userId}`, {
            method: 'DELETE'
        })
    }
}))
