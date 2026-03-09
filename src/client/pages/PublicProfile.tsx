import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Calendar, Globe, Twitter, Instagram, Github, AlertCircle, UserPlus, UserCheck, UserMinus, UserX
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { User as UserType, useAuthStore } from '@/stores/auth'
import { useFriendStore } from '@/stores/friend'
import { useToastStore } from '@/stores/toast'
import { UserBadge } from '@/components/common/UserBadge'
import { useTranslation } from 'react-i18next'

// Extend UserType to include badge info (if not already present in the store type)
type PublicUser = UserType & {
    isOwner?: boolean
    isAdmin?: boolean
    isPremium?: boolean
}

export default function PublicProfile() {
  const { userId } = useParams()
  const { user: authUser } = useAuthStore()
  const { friends, pending, sent, fetchFriends, sendRequest, acceptRequest, removeFriend } = useFriendStore()
  const { addToast } = useToastStore()
  const { t } = useTranslation()
  
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const fetchProfile = async () => {
        setLoading(true)
        const res = await apiFetch<PublicUser>(`/v1/users/${userId}`)
        if (res.ok) {
            setUser(res.data)
        } else {
            setError(res.error || 'User not found')
        }
        setLoading(false)
    }

    fetchProfile()
    if (authUser) {
        fetchFriends()
    }
  }, [userId, authUser])

  const handleSendRequest = async () => {
    if (!userId) return
    const success = await sendRequest(userId)
    if (success) addToast('Friend request sent!', 'success')
    else addToast('Failed to send request', 'error')
  }

  const handleAcceptRequest = async () => {
    // Find request ID
    const req = pending.find(r => r.requesterId === userId)
    if (!req) return
    const success = await acceptRequest(req.id)
    if (success) addToast('Friend request accepted!', 'success')
    else addToast('Failed to accept request', 'error')
  }

  const handleRemoveFriend = () => {
    const rel = friends.find(r => r.recipientId === userId || r.requesterId === userId)
    if (!rel) return
    setRemovingFriendId(rel.id)
  }

  const confirmRemoveFriend = async () => {
    if (!removingFriendId) return
    const success = await removeFriend(removingFriendId)
    if (success) addToast(t('profile.friendRemoved') || 'Friend removed', 'success')
    else addToast(t('profile.friendRemoveError') || 'Failed to remove friend', 'error')
    setRemovingFriendId(null)
  }

  if (loading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
      )
  }

  if (error || !user) {
      return (
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 py-20 text-center">
              <AlertCircle size={48} className="text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Not Found</h2>
              <p className="text-gray-500">{error || "The user you are looking for doesn't exist."}</p>
          </div>
      )
  }

  // Determine Banner Color
  const bannerColor = user.profileColor || (user.accent_color 
        ? `#${user.accent_color.toString(16).padStart(6, '0')}` 
        : '#4f46e5')

  const getBannerImage = () => {
    if (user.banner) {
        if (user.banner.startsWith('http')) return `url(${user.banner})`
        if (user.banner.startsWith('/uploads/')) return `url(${user.banner})`
        return `url(https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=1024)`
    }
    return undefined
  }

  const getAvatarUrl = () => {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    }
    const discriminator = parseInt(user.discriminator) % 5
    return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`
  }

  const joinDate = user.created 
    ? new Date(user.created).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'

  const socials = user.socials || {}

  // Friend Status Logic
  const isMe = authUser?.id === user.id
  const isFriend = friends.some(r => r.recipientId === user.id || r.requesterId === user.id)
  const isPending = pending.some(r => r.requesterId === user.id) // They sent to me
  const isSent = sent.some(r => r.recipientId === user.id) // I sent to them

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header Banner */}
      <div 
        className="relative h-48 w-full overflow-hidden rounded-t-2xl bg-cover bg-center md:h-64"
        style={{ 
          backgroundColor: bannerColor,
          backgroundImage: getBannerImage()
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Profile Info Section */}
      <div className="relative -mt-16 mb-8 flex flex-col items-center px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-end">
          {/* Avatar */}
          <div className="relative h-32 w-32 rounded-full border-4 border-white bg-white shadow-lg dark:border-gray-900 dark:bg-gray-900">
            <img 
              src={getAvatarUrl()} 
              alt={user.username}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          
          {/* Name & Badges */}
          <div className="mb-2 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                {user.username}
                {user.discriminator !== '0' && <span className="text-xl font-medium text-gray-500">#{user.discriminator}</span>}
                </h1>
                <UserBadge 
                    isOwner={user.isOwner}
                    isAdmin={user.isAdmin}
                    isPremium={user.isPremium}
                />
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 md:justify-start mt-1">
              <Calendar size={14} />
              <span>Joined {joinDate}</span>
            </div>
          </div>
        </div>
        {/* Actions */}
        <div className="mt-4 flex flex-col items-end gap-3 md:mt-0 md:mb-4">
            {!isMe && authUser && (
                <>
                    {isFriend && (
                        <button 
                            onClick={handleRemoveFriend}
                            className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                        >
                            <UserMinus size={16} />
                            Remove Friend
                        </button>
                    )}
                    {isPending && (
                        <button 
                            onClick={handleAcceptRequest}
                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-700"
                        >
                            <UserCheck size={16} />
                            Accept Request
                        </button>
                    )}
                    {isSent && (
                        <button 
                            disabled
                            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400"
                        >
                            <UserCheck size={16} />
                            Request Sent
                        </button>
                    )}
                    {!isFriend && !isPending && !isSent && (
                        <button 
                            onClick={handleSendRequest}
                            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700"
                        >
                            <UserPlus size={16} />
                            Add Friend
                        </button>
                    )}
                </>
            )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Bio & Socials */}
        <div className="space-y-6 lg:col-span-2">
          {/* Bio Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <User size={20} className="text-primary-500" />
              Biography
            </h2>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {user.bio || <span className="italic text-gray-400">No biography provided.</span>}
            </p>
          </div>

          {/* Socials Card */}
          {Object.values(socials).some(Boolean) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                <Globe size={20} className="text-emerald-500" />
                Socials
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {socials.twitter && (
                    <a href={socials.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-500 dark:bg-sky-900/20">
                            <Twitter size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Twitter</span>
                    </a>
                )}
                {socials.instagram && (
                    <a href={socials.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-500 dark:bg-pink-900/20">
                            <Instagram size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Instagram</span>
                    </a>
                )}
                {socials.github && (
                    <a href={socials.github} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            <Github size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">GitHub</span>
                    </a>
                )}
                {socials.website && (
                    <a href={socials.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20">
                            <Globe size={18} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Website</span>
                    </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Stats */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
             <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Stats
             </h2>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">ID</span>
                    <span className="font-mono text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{user.id}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Remove Friend Confirmation Modal */}
      <AnimatePresence>
          {removingFriendId && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setRemovingFriendId(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                  >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                          <UserMinus size={24} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {t('profile.removeFriendTitle') || 'Remove Friend'}
                      </h3>
                      
                      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                          {t('profile.removeFriendDesc') || 'Are you sure you want to remove this user from your friends list?'}
                      </p>

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setRemovingFriendId(null)}
                              className="flex-1 rounded-xl bg-gray-100 p-3 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                              {t('profile.cancel')}
                          </button>
                          <button 
                              onClick={confirmRemoveFriend}
                              className="flex-1 rounded-xl bg-red-600 p-3 text-sm font-bold text-white hover:bg-red-700"
                          >
                              {t('profile.removeFriendTitle') || 'Remove'}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  )
}
