import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Calendar, Edit2, Save, X, 
  Twitter, Instagram, Github, Globe, MessageSquare, AlertCircle,
  Palette, Image as ImageIcon, Upload, Trash2, Camera, Move, Crown, ShieldCheck, BadgeCheck,
  Users, UserCheck, UserPlus, UserX
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '@/lib/api'
import { useToastStore } from '@/stores/toast'
import { useFriendStore } from '@/stores/friend'
import { UserBadge } from '@/components/common/UserBadge'

import { Link } from 'react-router-dom'

export default function Profile() {
  const { user, fetchUser } = useAuthStore()
  const { friends, pending, sent, fetchFriends, acceptRequest, rejectRequest, removeFriend } = useFriendStore()
  const { t } = useTranslation()
  const { addToast } = useToastStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'friends'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  
  // Banner Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tempFile, setTempFile] = useState<File | null>(null)
  const [bannerPositionY, setBannerPositionY] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<number>(0)
  const bannerRef = useRef<HTMLDivElement>(null)

  // Form State
  const [bio, setBio] = useState('')
  const [banner, setBanner] = useState('')
  const [bannerTimestamp, setBannerTimestamp] = useState(Date.now())
  const [profileColor, setProfileColor] = useState('')
  const [socials, setSocials] = useState({
    twitter: '',
    instagram: '',
    github: '',
    website: ''
  })

  useEffect(() => {
    if (user) {
      setBio(user.bio || '')
      setBanner(user.banner && (user.banner.startsWith('http') || user.banner.startsWith('/uploads/')) ? user.banner : '')
      setProfileColor(user.profileColor || '')
      setSocials({
        twitter: user.socials?.twitter || '',
        instagram: user.socials?.instagram || '',
        github: user.socials?.github || '',
        website: user.socials?.website || ''
      })
      setBannerPositionY(50) // Reset position
      setTempFile(null)
      fetchFriends() // Fetch friends when user loads
    }
  }, [user])

  const handleAcceptRequest = async (requestId: string) => {
    const success = await acceptRequest(requestId)
    if (success) addToast('Friend request accepted!', 'success')
    else addToast('Failed to accept request', 'error')
  }

  const handleRejectRequest = (requestId: string) => {
    setRejectingId(requestId)
  }

  const confirmReject = async () => {
    if (!rejectingId) return
    const success = await rejectRequest(rejectingId)
    if (success) addToast(t('profile.requestRejected'), 'success')
    else addToast(t('profile.requestRejectError'), 'error')
    setRejectingId(null)
  }

  const handleRemoveFriend = async (relId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return
    const success = await removeFriend(relId)
    if (success) addToast('Friend removed', 'success')
    else addToast('Failed to remove friend', 'error')
  }

  const validateUrl = (url: string, platform: string) => {
    if (!url) return true
    try {
        const u = new URL(url)
        if (platform === 'twitter' && !u.hostname.includes('twitter.com') && !u.hostname.includes('x.com')) return false
        if (platform === 'instagram' && !u.hostname.includes('instagram.com')) return false
        if (platform === 'github' && !u.hostname.includes('github.com')) return false
        return true
    } catch (e) {
        return false
    }
  }

  const handleBannerMouseDown = (e: React.MouseEvent) => {
    if (!isEditing || !banner || !user?.isPremium) return
    setIsDragging(true)
    dragStartRef.current = e.clientY
  }

  const handleBannerMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const delta = e.clientY - dragStartRef.current
    // Sensitivity: 1px = 0.2% change
    const change = delta * 0.2
    setBannerPositionY(prev => Math.min(100, Math.max(0, prev - change)))
    dragStartRef.current = e.clientY
  }

  const handleBannerMouseUp = () => setIsDragging(false)
  const handleBannerMouseLeave = () => setIsDragging(false)

  const handleSave = async () => {
    setErrorMsg(null)

    // Validation
    if (!validateUrl(socials.twitter, 'twitter')) { setErrorMsg('Invalid Twitter URL'); return }
    if (!validateUrl(socials.instagram, 'instagram')) { setErrorMsg('Invalid Instagram URL'); return }
    if (!validateUrl(socials.github, 'github')) { setErrorMsg('Invalid GitHub URL'); return }
    if (!validateUrl(socials.website, 'website')) { setErrorMsg('Invalid Website URL'); return }

    setBusy(true)

    // Handle Banner Upload if new file
    let finalBannerUrl = banner
    if (tempFile) {
        try {
            // Create canvas for cropping
            const img = new Image()
            img.src = banner // this is the blob URL currently displayed
            await new Promise(r => img.onload = r)
            
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            // Target dimensions (High Res Banner)
            canvas.width = 1200
            canvas.height = 300 // 4:1 aspect ratio
            
            // Calculate source crop
            // We want to fit width and crop height based on bannerPositionY
            // Source Width = Image Width
            // Source Height = Image Width / 4
            
            let sWidth = img.naturalWidth
            let sHeight = sWidth / 4
            
            // If image is too short (wide), we might need to adjust
            if (img.naturalHeight < sHeight) {
                // Image is wider than 4:1
                // We use full height and crop width? No, banners are width-first.
                // We just center it vertically or stretch?
                // Let's just use full image if it's too short, or scale it.
                sHeight = img.naturalHeight
            }
            
            // Calculate Y offset
            // bannerPositionY = 0% -> Top (sy = 0)
            // bannerPositionY = 100% -> Bottom (sy = img.height - sHeight)
            const maxSy = Math.max(0, img.naturalHeight - sHeight)
            const sy = maxSy * (bannerPositionY / 100)
            
            ctx.drawImage(img, 0, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height)
            
            const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.9))
            
            if (blob) {
                // Upload Blob as File
                const reader = new FileReader()
                const base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string)
                    reader.readAsDataURL(blob)
                })
                
                const uploadRes = await apiFetch<{ url: string }>('/v1/upload', {
                    method: 'POST',
                    body: JSON.stringify({ image: base64 })
                })
                
                if (uploadRes.ok) {
                    finalBannerUrl = uploadRes.data.url
                    setBannerTimestamp(Date.now())
                    addToast('Banner uploaded successfully', 'success')
                } else {
                    throw new Error(t('profile.uploadError'))
                }
            }
        } catch (e) {
            setErrorMsg('Error processing banner')
            setBusy(false)
            return
        }
    }

    const res = await apiFetch('/v1/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ bio, socials, banner: finalBannerUrl, profileColor })
    })
    
    if (res.ok) {
      await fetchUser()
      setIsEditing(false)
      addToast(t('settings.success'), 'success')
    } else {
      setErrorMsg('Error saving profile: ' + (res.error || 'Unknown error'))
      addToast('Error saving profile', 'error')
    }
    setBusy(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0]
        setTempFile(file)
        setBanner(URL.createObjectURL(file))
        setBannerPositionY(50) // Reset to center
    }
  }

  if (!user) return null

  // Format Join Date
  const joinDate = user.created 
    ? new Date(user.created).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'

  // Determine Banner Color
  const bannerColor = (isEditing && profileColor) 
    ? profileColor 
    : user.profileColor || (user.accent_color 
        ? `#${user.accent_color.toString(16).padStart(6, '0')}` 
        : '#4f46e5')

  const getBannerImage = () => {
    // If editing and we have a banner, show it (local or remote)
    if (isEditing && banner) {
        // Check if it's a relative path (uploaded) or absolute (external)
        if (banner.startsWith('http')) return `url(${banner})`
        if (banner.startsWith('blob:')) return `url(${banner})`
        // Fix for uploaded banner display: if starts with /uploads, prepend origin? 
        // Actually CSS url() handles relative paths fine if base is correct, but let's be explicit
        if (banner.startsWith('/uploads/')) return `url(${banner}?t=${bannerTimestamp})`
        return `url(${banner}?t=${bannerTimestamp})`
    }
    
    // If not editing, show user banner if exists
    if (user.banner) {
        if (user.banner.startsWith('http')) return `url(${user.banner})`
        // Discord banner or Local upload
        if (user.banner.startsWith('/uploads/')) return `url(${user.banner}?t=${bannerTimestamp})`
        // Fallback to Discord Banner if available
        return `url(https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=1024)`
    }
    return undefined
  }

  const getAvatarUrl = () => {
    if (user.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    }
    // Default avatar based on discriminator modulo 5
    const discriminator = parseInt(user.discriminator) % 5
    return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`
  }

  return (
    <div className="mx-auto max-w-5xl">

      {/* Header Banner */}
      <div 
        ref={bannerRef}
        className={`relative h-48 w-full overflow-hidden rounded-t-2xl bg-cover md:h-64 ${isEditing && banner && user.isPremium ? 'cursor-move' : ''}`}
        style={{ 
          backgroundColor: bannerColor,
          backgroundImage: getBannerImage(),
          backgroundPosition: `center ${bannerPositionY}%`
        }}
        onMouseDown={handleBannerMouseDown}
        onMouseMove={handleBannerMouseMove}
        onMouseUp={handleBannerMouseUp}
        onMouseLeave={handleBannerMouseLeave}
      >
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        
        {/* Drag Hint */}
        {isEditing && banner && user.isPremium && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                <div className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
                    <Move size={16} />
                    <span className="text-sm font-bold">Drag to Reposition</span>
                </div>
            </div>
        )}
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
            {/* Premium Indicator */}
            {user.isPremium && (
                <div className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-gradient-to-r from-amber-300 to-orange-500 text-white shadow-sm dark:border-gray-900" title={t('badge.premium') || 'Premium'}>
                    <Crown size={14} fill="currentColor" />
                </div>
            )}
          </div>
          
          {/* Name & Badges */}
          <div className="mb-2 text-center md:text-left">
            <h1 className="flex flex-wrap items-center justify-center gap-3 text-3xl font-black text-gray-900 dark:text-white md:justify-start">
              {user.username}
              {user.discriminator !== '0' && <span className="text-xl font-medium text-gray-500">#{user.discriminator}</span>}
              
              {/* Badges */}
            <div className="flex items-center gap-2">
                <UserBadge 
                    isOwner={user.isOwner}
                    isAdmin={user.isAdmin}
                    isPremium={user.isPremium}
                />
            </div>
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 md:justify-start">
              <Calendar size={14} />
              <span>{t('profile.joined')} {joinDate}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col items-end gap-3 md:mt-0 md:mb-4">
          <AnimatePresence>
            {errorMsg && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400"
                >
                    <AlertCircle size={14} />
                    {errorMsg}
                </motion.div>
            )}
          </AnimatePresence>

          {!isEditing ? (
            <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700' : 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700'}`}
                >
                  <User size={16} />
                  Profile
                </button>
                <button 
                  onClick={() => setActiveTab('friends')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${activeTab === 'friends' ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700' : 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700'}`}
                >
                  <Users size={16} />
                  Friends
                  {((pending || []).length > 0) && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                          {(pending || []).length}
                      </span>
                  )}
                </button>
                {activeTab === 'profile' && (
                    <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
                    >
                    <Edit2 size={16} />
                    {t('profile.edit')}
                    </button>
                )}
            </div>
          ) : (
            <div className="flex gap-2">
               <button 
                onClick={() => { setIsEditing(false); setErrorMsg(null); }}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
              >
                <X size={16} />
                {t('profile.cancel')}
              </button>
              <button 
                onClick={handleSave}
                disabled={busy}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 disabled:opacity-50"
              >
                <Save size={16} />
                {busy ? t('profile.saving') : t('profile.save')}
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'friends' ? (
        <div className="space-y-6">
            {/* Pending Requests */}
            {(pending || []).length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                        <UserPlus size={20} className="text-amber-500" />
                        Pending Requests
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {pending.map(req => (
                            <div key={req.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                        <img src={`https://cdn.discordapp.com/embed/avatars/${parseInt(req.requesterId) % 5}.png`} className="h-full w-full object-cover" />
                                    </div>
                                    <div>
                                        <Link to={`/users/${req.requesterId}`} className="font-bold text-gray-900 hover:underline dark:text-white block truncate w-24">
                                            {req.user?.username || req.requesterId}
                                        </Link>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-gray-500">Sent a request</span>
                                            {req.user && (
                                                <UserBadge 
                                                    isOwner={false} // We don't have this info in Relationship yet, would need to fetch full user profile
                                                    isAdmin={false} 
                                                    isPremium={false} 
                                                    className="scale-75 origin-left"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAcceptRequest(req.id)}
                                        className="rounded-full bg-green-500 p-2 text-white hover:bg-green-600 shadow-sm transition-colors"
                                        title="Accept"
                                    >
                                        <UserCheck size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleRejectRequest(req.id)}
                                        className="rounded-full bg-red-100 p-2 text-red-500 hover:bg-red-200 shadow-sm transition-colors dark:bg-red-900/30 dark:hover:bg-red-900/50"
                                        title="Reject"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <Users size={20} className="text-primary-500" />
                    My Friends ({(friends || []).length})
                </h2>
                
                {(friends || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p>You haven't added any friends yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {friends.map(friend => {
                            const friendId = friend.requesterId === user.id ? friend.recipientId : friend.requesterId
                            return (
                                <div key={friend.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                            <img src={friend.user?.avatar ? `https://cdn.discordapp.com/avatars/${friend.user.id}/${friend.user.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/${parseInt(friendId) % 5}.png`} className="h-full w-full object-cover" />
                                        </div>
                                        <div>
                                            <Link to={`/users/${friendId}`} className="font-bold text-gray-900 hover:underline dark:text-white">
                                                {friend.user?.username || friendId}
                                            </Link>
                                            <div className="flex items-center gap-1">
                                                <p className="text-xs text-gray-500">Friend</p>
                                                <UserBadge className="scale-75 origin-left" />
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveFriend(friend.id)}
                                        className="opacity-0 group-hover:opacity-100 rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-red-100 hover:text-red-500 dark:bg-gray-800 dark:hover:bg-red-900/30 transition-all"
                                        title="Remove Friend"
                                    >
                                        <UserX size={16} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
      ) : (
      /* Content Grid */
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Bio & Socials */}
        <div className="space-y-6 lg:col-span-2">
          {/* Bio Card */}
          <motion.div 
            layout
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <User size={20} className="text-primary-500" />
              {t('profile.bio')}
            </h2>
            
            {isEditing ? (
              <textarea
                id="profile-bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.placeholderBio')}
                className="h-32 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                maxLength={200}
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                {bio || <span className="italic text-gray-400">{t('profile.noBio')}</span>}
              </p>
            )}
          </motion.div>

          {/* Socials Card (Only show if editing or has content) */}
          {(isEditing || Object.values(socials).some(Boolean)) && (
            <motion.div 
              layout
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                <Globe size={20} className="text-emerald-500" />
                {t('profile.socials')}
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Twitter */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-500 dark:bg-sky-900/20">
                    <Twitter size={20} />
                  </div>
                  {isEditing ? (
                    <input 
                      id="profile-twitter"
                      name="twitter"
                      value={socials.twitter}
                      onChange={(e) => setSocials({...socials, twitter: e.target.value})}
                      placeholder="Twitter URL"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  ) : socials.twitter ? (
                    <a href={socials.twitter} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
                      Twitter
                    </a>
                  ) : <span className="text-sm text-gray-400">-</span>}
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-500 dark:bg-pink-900/20">
                    <Instagram size={20} />
                  </div>
                  {isEditing ? (
                    <input 
                      id="profile-instagram"
                      name="instagram"
                      value={socials.instagram}
                      onChange={(e) => setSocials({...socials, instagram: e.target.value})}
                      placeholder="Instagram URL"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  ) : socials.instagram ? (
                    <a href={socials.instagram} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
                      Instagram
                    </a>
                  ) : <span className="text-sm text-gray-400">-</span>}
                </div>

                {/* Github */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    <Github size={20} />
                  </div>
                  {isEditing ? (
                    <input 
                      id="profile-github"
                      name="github"
                      value={socials.github}
                      onChange={(e) => setSocials({...socials, github: e.target.value})}
                      placeholder="GitHub URL"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  ) : socials.github ? (
                    <a href={socials.github} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
                      GitHub
                    </a>
                  ) : <span className="text-sm text-gray-400">-</span>}
                </div>

                {/* Website */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20">
                    <Globe size={20} />
                  </div>
                  {isEditing ? (
                    <input 
                      id="profile-website"
                      name="website"
                      value={socials.website}
                      onChange={(e) => setSocials({...socials, website: e.target.value})}
                      placeholder="Website URL"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  ) : socials.website ? (
                    <a href={socials.website} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
                      Website
                    </a>
                  ) : <span className="text-sm text-gray-400">-</span>}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column: Stats & Badges */}
        <div className="space-y-6">
          
          {/* Customization Card */}
          {isEditing && (
            <motion.div 
              layout
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
               <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                  <Palette size={20} className="text-purple-500" />
                  {t('profile.customization') || 'Customization'}
               </h2>

               <div className="space-y-4">
                  {/* Banner Upload */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('profile.banner')}
                        </label>
                        {!user.isPremium && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Premium Only
                            </span>
                        )}
                    </div>
                    
                    <div className={`flex flex-col gap-3 ${!user.isPremium ? 'opacity-60 grayscale' : ''}`}>
                        {/* Preview */}
                        <div className="relative h-32 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            {banner ? (
                                <>
                                    <img src={banner.startsWith('http') || banner.startsWith('blob:') ? banner : `${banner}?t=${bannerTimestamp}`} alt="Banner" className="h-full w-full object-cover" />
                                    {user.isPremium && (
                                        <button 
                                            onClick={() => { setBanner(''); setTempFile(null); }}
                                            className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600 shadow-md transition-colors"
                                            title={t('profile.removeBanner')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                                    <div className="rounded-full bg-gray-200 p-3 dark:bg-gray-700">
                                        <Camera size={24} />
                                    </div>
                                    <span className="text-xs font-medium">No banner</span>
                                </div>
                            )}
                        </div>

                        {/* Upload Button */}
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={!user.isPremium}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!user.isPremium}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            {user.isPremium ? (
                                <>
                                    <Upload size={16} />
                                    {t('profile.uploadBanner')}
                                </>
                            ) : (
                                <>
                                    <Crown size={16} className="text-amber-500" />
                                    Unlock Custom Banner
                                </>
                            )}
                        </button>
                        <p className="text-xs text-gray-500">{t('profile.bannerDesc')}</p>
                    </div>
                  </div>

                  {/* Profile Color */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('profile.profileColor')}
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color"
                        value={profileColor || bannerColor}
                        onChange={(e) => setProfileColor(e.target.value)}
                        className="h-10 w-20 cursor-pointer rounded border-none bg-transparent"
                      />
                      <span className="font-mono text-sm text-gray-500">{profileColor || bannerColor}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{t('profile.profileColorDesc')}</p>
                  </div>
               </div>
            </motion.div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
             <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('profile.stats')}
             </h2>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">ID</span>
                    <span className="font-mono text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{user.id}</span>
                </div>
                {/* Add more stats here later */}
             </div>
          </div>
        </div>
      </div>
      )}

      {/* Reject Confirmation Modal */}
      <AnimatePresence>
          {rejectingId && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setRejectingId(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                  >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                          <UserX size={24} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {t('profile.confirmRejectTitle')}
                      </h3>
                      
                      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                          {t('profile.confirmRejectDesc')}
                      </p>

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setRejectingId(null)}
                              className="flex-1 rounded-xl bg-gray-100 p-3 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                              {t('profile.cancel')}
                          </button>
                          <button 
                              onClick={confirmReject}
                              className="flex-1 rounded-xl bg-red-600 p-3 text-sm font-bold text-white hover:bg-red-700"
                          >
                              {t('profile.confirmRejectTitle')}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  )
}