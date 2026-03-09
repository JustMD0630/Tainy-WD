import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useToastStore } from '@/stores/toast'

export default function NotificationManager() {
    const { user } = useAuthStore()
    const { fetchNotifications, notifications } = useNotificationStore()
    const { addToast } = useToastStore()
    
    // Store the last known notification ID to check for new ones
    const lastNotificationIdRef = useRef<string | null>(null)
    const initialLoadRef = useRef(true)

    useEffect(() => {
        if (!user) return

        const poll = async () => {
            await fetchNotifications(user.id)
        }

        // Initial fetch
        poll()

        const interval = setInterval(poll, 30000)
        return () => clearInterval(interval)
    }, [user, fetchNotifications])

    // Check for new notifications to trigger toast
    useEffect(() => {
        if (initialLoadRef.current) {
            if (notifications.length > 0) {
                lastNotificationIdRef.current = notifications[0].id // Most recent because of sort
            }
            initialLoadRef.current = false
            return
        }

        if (notifications.length > 0) {
            const mostRecent = notifications[0]
            if (mostRecent.id !== lastNotificationIdRef.current) {
                // New notification detected!
                if (!mostRecent.read) {
                    addToast(mostRecent.title, mostRecent.type === 'warn' ? 'error' : mostRecent.type === 'error' ? 'error' : 'info')
                }
                lastNotificationIdRef.current = mostRecent.id
            }
        }
    }, [notifications, addToast])

    return null
}
