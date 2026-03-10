import { useEffect, useState, useRef } from 'react'
import { 
  Users, Music, MessageSquare, AlertCircle, 
  LayoutGrid, Flag, Bell, Shield, History,
  ExternalLink, ChevronRight, Activity, Globe, Server,
  Download, CheckCircle, Archive, Trash2, XCircle, RefreshCw,
  AlertTriangle, ListMusic, Search, Cpu, HardDrive, Zap,
  Filter, Calendar, Clock, ArrowUp, ArrowDown, Check, ChevronDown
} from 'lucide-react'
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts'
import { apiFetch } from '@/lib/api'
import { useConfigStore } from '@/stores/config'
import { useBotStore } from '@/stores/bot'
import { useAuthStore } from '@/stores/auth'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useToastStore } from '@/stores/toast'

// Types
type AdminStats = {
    totalUsers: number
    totalPlaylists: number
    publicPlaylists: number
    totalComments: number
    pendingReports: number
    botGuilds: number
    botUsers: number
    uptime: number
    playing?: number
    
    system?: {
        cpu: number
        memory: number
        memoryTotal: number
        uptime: number
        platform: string
        cores: number
    }
    
    nodes?: Array<{
        name: string
        host: string
        port: number
        state: number // 0: CONNECTED, 1: DISCONNECTED, 2: RECONNECTING, 3: DISCONNECTING
        stats?: {
            players: number
            playingPlayers: number
            uptime: number
            memory: {
                used: number
                free: number
                allocated: number
                reservable: number
            }
            cpu: {
                cores: number
                systemLoad: number
                lavalinkLoad: number
            }
        }
    }>
}

type StatsPoint = {
    time: string
    cpu: number
    memory: number
}

type Report = {
    id: string
    created: number
    status: 'pending' | 'dismissed' | 'resolved'
    reason: string
    commentContent: string
    commentId: string
    reporterId: string
    reporterName: string
    reporterAvatar: string | null
    offenderId: string
    offenderName: string
    playlistId?: string
}

type AdminNotification = {
    id: string
    title: string
    message: string
    created: number
    read: boolean
    userId: string
    userName: string
    userAvatar: string | null
}

type BannedUser = {
    id: string
    username: string
    avatar: string | null
    banLevel: number
    banExpires?: number
    banReason?: string
}

type HistoryItem = {
    id: string
    type: 'warn' | 'mute' | 'ban' | 'unban'
    title: string
    message: string
    created: number
    targetId: string
}

type AdminGuild = {
    id: string
    name: string
    icon: string | null
    memberCount: number
    ownerId: string
    ownerName: string
    joinedAt: number
    createdAt: number
    isPlaying: boolean
}

type HistoryUser = {
    id: string
    username: string
    avatar: string | null
    discriminator: string
    warns: number
    banned: boolean
    muted: boolean
    banLevel?: number
    historyCount: number
    lastInfraction: number
}

export default function Admin() {
  const { config, status: configStatus } = useConfigStore()
  const { info: botInfo, fetchInfo: fetchBotInfo } = useBotStore()
  const { user, token } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'notifications' | 'banned' | 'history' | 'servers'>('overview')
  const [loading, setLoading] = useState(true)
  
  // Data State
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [userHistory, setUserHistory] = useState<HistoryItem[]>([]) // Detailed history for selected user
  const [historyUsers, setHistoryUsers] = useState<HistoryUser[]>([]) // List of all users with history
  const [guilds, setGuilds] = useState<AdminGuild[]>([])
  
  const [selectedUser, setSelectedUser] = useState<HistoryUser | null>(null)
  const [historySearchId, setHistorySearchId] = useState('')
  const [guildSearchQuery, setGuildSearchQuery] = useState('')
  const [guildSort, setGuildSort] = useState<'members' | 'name' | 'joined' | 'created'>('members')
  const [guildSortOrder, setGuildSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')

  // Notification Filter
  const [notificationSort, setNotificationSort] = useState<'date' | 'read'>('date')
  const [notificationSortOrder, setNotificationSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isNotifSortOpen, setIsNotifSortOpen] = useState(false)

  // Modal Dropdown States
  const [isBanLevelOpen, setIsBanLevelOpen] = useState(false)
  const [isBanDurationOpen, setIsBanDurationOpen] = useState(false)
  const [isMuteDurationOpen, setIsMuteDurationOpen] = useState(false)

  const [confirmAction, setConfirmAction] = useState<{ 
      action: 'dismiss' | 'delete_comment' | 'restore' | 'ban_user' | 'mute_user' | 'warn_user' | 'unban_user' | 'leave_guild', 
      reportId?: string, 
      commentId?: string,
      targetUserId?: string,
      offenderName?: string,
      guildId?: string,
      guildName?: string,
      duration?: number // Mute duration
      banLevel?: number // 1, 2, 3
      banReason?: string
  } | null>(null)
  
  // Filters
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'dismissed' | 'resolved'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  // WebSocket & Charts
  const wsRef = useRef<WebSocket | null>(null)
  const [statsHistory, setStatsHistory] = useState<StatsPoint[]>([])

  // Mute/Ban selection
  const [muteDuration, setMuteDuration] = useState(24) // Default 24h
  const [banLevel, setBanLevel] = useState(1)
  const [banReason, setBanReason] = useState('')
  
  // Timer for banned users page to update relative times
  useEffect(() => {
      const interval = setInterval(() => {
          setBannedUsers(prev => [...prev]) // Force re-render
      }, 60000)
      return () => clearInterval(interval)
  }, [])

  // WebSocket Connection
  useEffect(() => {
      if (!user || configStatus !== 'success' || !token) return

      const isAdmin = config.botOwnerId === user.id || (config.botAdmins || []).includes(user.id)
      if (!isAdmin) return

      const connect = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) return

          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          const host = window.location.host
          
          console.log('[Admin] Connecting to WS...')
          const ws = new WebSocket(`${protocol}//${host}/v1/websocket?type=admin&authorization=Bearer ${token}`)
          
          ws.onopen = () => {
              console.log('[Admin] WS Connected')
          }

          ws.onmessage = (event) => {
              try {
                  const payload = JSON.parse(event.data)
                  if (payload.op === 'stats') {
                      const data = payload.data
                      
                      // Update current stats
                      setStats(prev => {
                          // Merge with previous to avoid flickering if some fields are missing (though backend sends full object)
                          if (!prev) return data
                          return { ...prev, ...data }
                      })

                      // Update history
                      setStatsHistory(prev => {
                          const newPoint = {
                              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                              cpu: parseFloat(data.system.cpu.toFixed(1)),
                              memory: parseFloat((data.system.memory / 1024 / 1024).toFixed(1)) // MB
                          }
                          const newHistory = [...prev, newPoint]
                          if (newHistory.length > 60) newHistory.shift() // Keep last 60 seconds
                          return newHistory
                      })
                  }
              } catch (e) {
                  console.error('WS Error', e)
              }
          }

          ws.onclose = (e) => {
              console.log('[Admin] WS Closed', e.code, e.reason)
              wsRef.current = null
              // Reconnect automatically after 3s
              setTimeout(() => {
                  if (location.pathname === '/admin') { // Only reconnect if still on admin page
                      connect()
                  }
              }, 3000)
          }

          ws.onerror = (err) => {
              console.error('[Admin] WS Error', err)
              ws.close()
          }

          wsRef.current = ws
      }

      connect()

      return () => {
          if (wsRef.current) {
              // Remove onclose to prevent reconnect loop during unmount
              wsRef.current.onclose = null 
              wsRef.current.close()
              wsRef.current = null
          }
      }
  }, [user, config, configStatus, token])
  
  const getTimeLeft = (expires?: number) => {
      if (!expires) return null
      const diff = expires - Date.now()
      if (diff <= 0) return t('admin.banned.expires') // Should imply expired
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (days > 0) return `${days}d ${hours}h`
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
  }

  useEffect(() => {
      if (!user) return
      if (configStatus === 'idle' || configStatus === 'loading') return
      
      const isAdmin = config.botOwnerId === user.id || (config.botAdmins || []).includes(user.id)
      if (!isAdmin) {
          navigate('/dashboard')
          return
      }

      fetchData()
  }, [user, config, configStatus])

  const fetchData = async () => {
      setLoading(true)
      if (!user) return

      try {
        const [statsRes, reportsRes, notesRes, bannedRes, guildsRes, historyRes] = await Promise.all([
            apiFetch<{ stats: AdminStats }>(`/v1/admin/stats`),
            apiFetch<{ reports: Report[] }>(`/v1/admin/reports`),
            apiFetch<{ notifications: AdminNotification[] }>(`/v1/admin/notifications`),
            apiFetch<BannedUser[]>(`/v1/admin/users/banned`),
            apiFetch<{ guilds: AdminGuild[] }>(`/v1/admin/guilds`),
            apiFetch<{ users: HistoryUser[] }>(`/v1/admin/history/users`)
        ])

        if (statsRes.ok) setStats(statsRes.data.stats)
        if (reportsRes.ok) setReports(reportsRes.data.reports)
        if (notesRes.ok) setNotifications(notesRes.data.notifications)
        if (bannedRes.ok) setBannedUsers(bannedRes.data)
        if (guildsRes.ok) setGuilds(guildsRes.data.guilds)
        if (historyRes.ok) setHistoryUsers(historyRes.data.users)
      } catch (e) {
          console.error("Error fetching admin data", e)
          addToast("Error loading admin data", "error")
      }
      
      setLoading(false)
  }

  const fetchUserHistory = async (targetId: string) => {
      setLoading(true)
      const res = await apiFetch<HistoryItem[]>(`/v1/admin/users/${targetId}/history`)
      if (res.ok) {
          setUserHistory(res.data)
      } else {
          addToast('No se encontró historial', 'error')
          setUserHistory([])
      }
      setLoading(false)
  }

  const handleUserSelect = (user: HistoryUser) => {
      setSelectedUser(user)
      fetchUserHistory(user.id)
  }

  const executeAction = async () => {
      if (!user || !confirmAction) return

      let endpoint = '/v1/admin/action'
      // We do not send userId anymore, the backend gets it from the token
      let body: any = {
          action: confirmAction.action,
          reportId: confirmAction.reportId,
          commentId: confirmAction.commentId,
          targetUserId: confirmAction.targetUserId,
          duration: confirmAction.action === 'mute_user' || confirmAction.action === 'ban_user' ? muteDuration : undefined,
          banLevel: confirmAction.action === 'ban_user' ? banLevel : undefined,
          reason: confirmAction.action === 'ban_user' ? banReason : undefined
      }

      if (confirmAction.action === 'leave_guild') {
          endpoint = `/v1/admin/guilds/${confirmAction.guildId}/leave`
          body = { 
              reason: leaveReason
          }
      }

      const r = await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(body)
      })

      if (r.ok) {
          addToast(t(confirmAction.action === 'leave_guild' ? 'admin.servers.modal.success' : 'admin.modal.success', { defaultValue: 'Acción realizada correctamente' }), 'success')
          fetchData() 
          setConfirmAction(null)
          setLeaveReason('') // Reset reason
      } else {
          addToast(t(confirmAction.action === 'leave_guild' ? 'admin.servers.modal.error' : 'admin.modal.error', { defaultValue: 'Error al procesar la acción' }), 'error')
      }
  }

  const filteredReports = reports.filter(r => {
      const matchesFilter = reportFilter === 'all' || r.status === reportFilter
      const matchesSearch = searchQuery.toLowerCase() === '' || 
          r.commentContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.offenderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.id.includes(searchQuery) ||
          r.offenderId.includes(searchQuery)
      
      return matchesFilter && matchesSearch
  })

  const downloadReports = () => {
      const content = filteredReports.map(r => `
### Reporte ${r.id}
- **Estado:** ${r.status}
- **Fecha:** ${new Date(r.created).toLocaleString()}
- **Motivo:** ${r.reason}
- **Reportado por:** ${r.reporterName} (${r.reporterId})
- **Reportado a:** ${r.offenderName} (${r.offenderId})
- **Contenido:**
> ${r.commentContent}
      `).join('\n---\n')

      const blob = new Blob([content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reportes-${new Date().toISOString().split('T')[0]}.md`
      a.click()
      URL.revokeObjectURL(url)
  }

  // Helper for formatting bytes
    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 B'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    // Helper for formatting duration
    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        
        if (days > 0) return `${days}d ${hours % 24}h`
        if (hours > 0) return `${hours}h ${minutes % 60}m`
        return `${minutes}m ${seconds % 60}s`
    }

    const sortedGuilds = [...guilds]
        .filter(g => 
            g.name.toLowerCase().includes(guildSearchQuery.toLowerCase()) || 
            g.id.includes(guildSearchQuery) || 
            g.ownerId.includes(guildSearchQuery)
        )
        .sort((a, b) => {
            let res = 0
            if (guildSort === 'members') res = a.memberCount - b.memberCount
            else if (guildSort === 'name') res = a.name.localeCompare(b.name)
            else if (guildSort === 'joined') res = a.joinedAt - b.joinedAt
            else if (guildSort === 'created') res = a.createdAt - b.createdAt
            
            return guildSortOrder === 'asc' ? res : -res
        })

    const sortedNotifications = [...notifications].sort((a, b) => {
        let res = 0
        if (notificationSort === 'date') res = a.created - b.created
        else if (notificationSort === 'read') res = (a.read === b.read) ? 0 : a.read ? 1 : -1
        return notificationSortOrder === 'asc' ? res : -res
    })

    const sortedHistoryUsers = [...historyUsers].filter(u => 
        u.username.toLowerCase().includes(historySearchId.toLowerCase()) || 
        u.id.includes(historySearchId)
    )

    if (configStatus === 'idle' || configStatus === 'loading') {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl h-full flex flex-col">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                      <Shield className="text-primary-600" size={32} />
                      {t('admin.title')}
                  </h1>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                      {t('admin.subtitle')}
                  </p>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-2 bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
                  <button
                      onClick={() => setActiveTab('overview')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                          activeTab === 'overview'
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                      {t('admin.tabs.overview')}
                  </button>
                  <button
                      onClick={() => setActiveTab('reports')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                          activeTab === 'reports'
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                      {t('admin.tabs.reports')}
                      {stats && stats.pendingReports > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                              {stats.pendingReports}
                          </span>
                      )}
                  </button>
                  <button
                      onClick={() => setActiveTab('notifications')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                          activeTab === 'notifications'
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                      {t('admin.tabs.notifications')}
                  </button>
                  <button
                      onClick={() => setActiveTab('banned')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                          activeTab === 'banned'
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                      {t('admin.tabs.banned')}
                  </button>
                  <button
                      onClick={() => setActiveTab('history')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                          activeTab === 'history'
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                      {t('admin.tabs.history')}
                  </button>
                  <button
                      onClick={() => setActiveTab('servers')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                          activeTab === 'servers'
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                      {t('admin.tabs.servers')}
                  </button>
              </div>
          </div>

          {activeTab === 'overview' && stats && (
              <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
              >
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard icon={<Users />} label={t('admin.stats.users')} value={stats.totalUsers} color="blue" />
                      <StatCard icon={<ListMusic />} label={t('admin.stats.playlists')} value={stats.totalPlaylists} subValue={`${stats.publicPlaylists} ${t('admin.stats.public')}`} color="purple" />
                      <StatCard icon={<MessageSquare />} label={t('admin.stats.comments')} value={stats.totalComments} color="green" />
                      <StatCard icon={<AlertTriangle />} label={t('admin.stats.pendingReports')} value={stats.pendingReports} color="red" />
                  </div>

                  {/* System Resources & Status */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* System Stats (Real-time Charts) */}
                      <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                              <Activity className="text-primary-600" />
                              {t('admin.stats.systemStatus')}
                              <span className="ml-auto text-xs font-mono text-green-500 animate-pulse">● LIVE</span>
                          </h3>
                          
                          {stats.system && (
                              <div className="space-y-8">
                                  {/* CPU Chart */}
                                  <div className="h-48 w-full">
                                      <div className="flex justify-between mb-2">
                                          <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                                              <Cpu size={16} /> CPU Load
                                          </span>
                                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                                              {stats.system.cpu.toFixed(1)}%
                                          </span>
                                      </div>
                                      <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={statsHistory}>
                                              <defs>
                                                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                  </linearGradient>
                                              </defs>
                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                              <XAxis dataKey="time" hide />
                                              <YAxis domain={[0, 100]} hide />
                                              <RechartsTooltip 
                                                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                  itemStyle={{ color: '#fff' }}
                                                  formatter={(value: number) => [`${value}%`, 'CPU']}
                                                  labelStyle={{ color: '#9ca3af' }}
                                              />
                                              <Area 
                                                  type="monotone" 
                                                  dataKey="cpu" 
                                                  stroke="#ef4444" 
                                                  fillOpacity={1} 
                                                  fill="url(#colorCpu)" 
                                                  isAnimationActive={false}
                                              />
                                          </AreaChart>
                                      </ResponsiveContainer>
                                  </div>

                                  {/* RAM Chart */}
                                  <div className="h-48 w-full">
                                      <div className="flex justify-between mb-2">
                                          <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                                              <HardDrive size={16} /> RAM Usage
                                          </span>
                                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                                              {formatBytes(stats.system.memory)} / {formatBytes(stats.system.memoryTotal)}
                                          </span>
                                      </div>
                                      <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={statsHistory}>
                                              <defs>
                                                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                  </linearGradient>
                                              </defs>
                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                              <XAxis dataKey="time" hide />
                                              <YAxis hide domain={[0, 'auto']} />
                                              <RechartsTooltip 
                                                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                  itemStyle={{ color: '#fff' }}
                                                  formatter={(value: number) => [`${value} MB`, 'RAM']}
                                                  labelStyle={{ color: '#9ca3af' }}
                                              />
                                              <Area 
                                                  type="monotone" 
                                                  dataKey="memory" 
                                                  stroke="#8b5cf6" 
                                                  fillOpacity={1} 
                                                  fill="url(#colorRam)" 
                                                  isAnimationActive={false}
                                              />
                                          </AreaChart>
                                      </ResponsiveContainer>
                                  </div>

                                  {/* Uptime Grid */}
                                  <div className="grid grid-cols-2 gap-4 mt-4">
                                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                          <p className="text-xs font-bold text-gray-500 uppercase">{t('admin.stats.processUptime')}</p>
                                          <p className="text-lg font-black text-gray-900 dark:text-white mt-1 font-mono">
                                              {formatDuration(stats.uptime * 1000)}
                                          </p>
                                      </div>
                                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                          <p className="text-xs font-bold text-gray-500 uppercase">{t('admin.stats.systemUptime')}</p>
                                          <p className="text-lg font-black text-gray-900 dark:text-white mt-1 font-mono">
                                              {formatDuration(stats.system.uptime * 1000)}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Lavalink Nodes */}
                      <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                              <Server className="text-primary-600" />
                              {t('admin.stats.lavalinkNodes')}
                          </h3>
                          
                          <div className="space-y-4">
                              {stats.nodes && stats.nodes.length > 0 ? (
                                  stats.nodes.map((node, i) => (
                                      <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                          <div className="flex justify-between items-center mb-3">
                                              <div className="flex items-center gap-2">
                                                  <div className={`h-3 w-3 rounded-full ${
                                                      node.state === 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                                  }`} />
                                                  <span className="font-bold text-gray-900 dark:text-white">{node.name}</span>
                                              </div>
                                              <span className={`text-xs px-2 py-1 rounded-lg font-bold ${
                                                  node.state === 0 
                                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                              }`}>
                                                  {node.state === 0 ? t('admin.stats.connected') : t('admin.stats.disconnected')}
                                              </span>
                                          </div>
                                          
                                          {node.stats ? (
                                              <div className="grid grid-cols-3 gap-2 text-center">
                                                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg">
                                                      <p className="text-[10px] uppercase text-gray-500 font-bold">{t('admin.stats.players')}</p>
                                                      <p className="text-sm font-bold">{node.stats.playingPlayers} / {node.stats.players}</p>
                                                  </div>
                                                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg">
                                                      <p className="text-[10px] uppercase text-gray-500 font-bold">{t('admin.stats.ram')}</p>
                                                      <p className="text-sm font-bold">{formatBytes(node.stats.memory?.used || 0)}</p>
                                                  </div>
                                                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg">
                                                      <p className="text-[10px] uppercase text-gray-500 font-bold">{t('admin.stats.load')}</p>
                                                      <p className="text-sm font-bold">{((node.stats.cpu?.lavalinkLoad || 0) * 100).toFixed(1)}%</p>
                                                  </div>
                                              </div>
                                          ) : (
                                              <p className="text-xs text-center text-gray-400 italic mt-2">{t('admin.stats.noStats')}</p>
                                          )}
                                      </div>
                                  ))
                              ) : (
                                  <div className="text-center py-8 text-gray-400">
                                      {t('admin.stats.noNodes')}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                  
                  {/* General Stats (Bot Overview) */}
                  <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                          <Zap className="text-yellow-500" />
                          {t('admin.stats.botOverview')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4">
                              <div className="p-4 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                  <Server size={24} />
                              </div>
                              <div>
                                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin.stats.guilds')}</p>
                                  <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.botGuilds.toLocaleString()}</p>
                              </div>
                          </div>
                          <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4">
                              <div className="p-4 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                  <Globe size={24} />
                              </div>
                              <div>
                                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin.stats.discordUsers')}</p>
                                  <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.botUsers.toLocaleString()}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </motion.div>
          )}

          {activeTab === 'reports' && (
              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
              >
                  {/* Toolbar */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                      <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                          {(['pending', 'dismissed', 'resolved', 'all'] as const).map((filter) => (
                              <button
                                  key={filter}
                                  onClick={() => setReportFilter(filter)}
                                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap transition-colors ${
                                      reportFilter === filter
                                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                              >
                                  {filter === 'all' ? t('admin.reports.filters.all') : filter === 'pending' ? t('admin.reports.filters.pending') : filter === 'dismissed' ? t('admin.reports.filters.dismissed') : t('admin.reports.filters.resolved')}
                              </button>
                          ))}
                      </div>

                      <div className="flex gap-2 w-full md:w-auto">
                          <div className="relative flex-1 md:w-64">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input 
                                  type="text" 
                                  placeholder={t('admin.reports.search')} 
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary-500 text-sm"
                              />
                          </div>
                          <button 
                              onClick={downloadReports}
                              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="Descargar reporte en Markdown"
                          >
                              <Download size={20} />
                          </button>
                      </div>
                  </div>

                  {/* Reports List */}
                  <div className="grid grid-cols-1 gap-4">
                      {filteredReports.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                              <CheckCircle className="h-16 w-16 text-green-500 mb-4 opacity-50" />
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('admin.reports.noResults')}</h3>
                              <p className="text-gray-500">{t('admin.reports.noResultsDesc')}</p>
                          </div>
                      ) : (
                          filteredReports.map((report) => (
                              <motion.div 
                                  key={report.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
                              >
                                  <div className="flex flex-col md:flex-row gap-6">
                                      {/* Left: Info */}
                                      <div className="flex-1 space-y-4">
                                          <div className="flex items-center gap-3">
                                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                  report.status === 'pending' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                  report.status === 'resolved' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                              }`}>
                                                  {report.status === 'pending' ? t('admin.reports.filters.pending') : report.status === 'resolved' ? t('admin.reports.filters.resolved') : t('admin.reports.filters.dismissed')}
                                              </span>
                                              <span className="text-xs text-gray-400 font-mono">ID: {report.id}</span>
                                              <span className="text-xs text-gray-400">• {new Date(report.created).toLocaleString()}</span>
                                          </div>

                                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-12">
                                              <div>
                                                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">{t('admin.reports.reportedBy')}</p>
                                                  <div className="flex items-center gap-2">
                                                      {report.reporterAvatar ? (
                                                          <img src={report.reporterAvatar} className="h-6 w-6 rounded-full" />
                                                      ) : <Users size={16} className="text-gray-400" />}
                                                      <div>
                                                          <p className="text-sm font-bold text-gray-900 dark:text-white">{report.reporterName}</p>
                                                          <p className="text-xs font-mono text-gray-500">{report.reporterId}</p>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div>
                                                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">{t('admin.reports.reportedUser')}</p>
                                                  <div className="flex items-center gap-2">
                                                      <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                                          <Users size={14} className="text-gray-500" />
                                                      </div>
                                                      <div>
                                                          <p className="text-sm font-bold text-gray-900 dark:text-white">{report.offenderName}</p>
                                                          <p className="text-xs font-mono text-gray-500">{report.offenderId}</p>
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>

                                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                                              <div className="flex items-center gap-2 mb-2">
                                                  <span className="text-xs font-bold text-red-500 uppercase">{t('admin.reports.reason')}:</span>
                                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{report.reason}</span>
                                              </div>
                                              <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                                  "{report.commentContent}"
                                              </p>
                                          </div>
                                      </div>

                                      {/* Right: Actions */}
                                      <div className="flex md:flex-col items-center md:justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-6">
                                          {report.status === 'pending' && (
                                              <>
                                                  <button 
                                                      onClick={() => setConfirmAction({ action: 'dismiss', reportId: report.id, commentId: report.commentId })}
                                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 transition-colors"
                                                  >
                                                      <Archive size={16} />
                                                      {t('admin.reports.actions.dismiss')}
                                                  </button>
                                                  
                                                  <div className="grid grid-cols-2 gap-2 w-full">
                                                      <button 
                                                          onClick={() => setConfirmAction({ action: 'warn_user', reportId: report.id, commentId: report.commentId, offenderName: report.offenderName })}
                                                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 text-sm font-bold text-yellow-600 dark:text-yellow-400 transition-colors"
                                                          title="Advertir Usuario"
                                                      >
                                                          <AlertTriangle size={16} />
                                                          {t('admin.reports.actions.warn')}
                                                      </button>
                                                      <button 
                                                          onClick={() => setConfirmAction({ action: 'mute_user', reportId: report.id, commentId: report.commentId, offenderName: report.offenderName })}
                                                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-sm font-bold text-orange-600 dark:text-orange-400 transition-colors"
                                                          title="Silenciar Usuario"
                                                      >
                                                          <MessageSquare size={16} className="opacity-50" />
                                                          {t('admin.reports.actions.mute')}
                                                      </button>
                                                  </div>

                                                  <button 
                                                      onClick={() => setConfirmAction({ action: 'delete_comment', reportId: report.id, commentId: report.commentId })}
                                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-sm font-bold text-red-600 dark:text-red-400 transition-colors"
                                                  >
                                                      <Trash2 size={16} />
                                                      {t('admin.reports.actions.delete')}
                                                  </button>

                                                  <button 
                                                      onClick={() => setConfirmAction({ action: 'ban_user', reportId: report.id, commentId: report.commentId, offenderName: report.offenderName })}
                                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-bold text-white transition-colors shadow-lg shadow-red-600/20"
                                                  >
                                                      <XCircle size={16} />
                                                      {t('admin.reports.actions.ban')}
                                                  </button>
                                              </>
                                          )}
                                          {report.status === 'dismissed' && (
                                              <button 
                                                  onClick={() => setConfirmAction({ action: 'restore', reportId: report.id, commentId: report.commentId })}
                                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-sm font-bold text-blue-600 dark:text-blue-400 transition-colors"
                                              >
                                                  <RefreshCw size={16} />
                                                  {t('admin.reports.actions.restore')}
                                              </button>
                                          )}
                                          <a 
                                              href={report.playlistId ? `/explore?playlistId=${report.playlistId}` : '/explore'}
                                              target="_blank"
                                              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                  report.playlistId 
                                                      ? 'text-gray-400 hover:text-primary-600' 
                                                      : 'text-gray-300 cursor-not-allowed'
                                              }`}
                                              onClick={(e) => !report.playlistId && e.preventDefault()}
                                          >
                                              <ExternalLink size={16} />
                                              {t('admin.reports.actions.context')}
                                          </a>
                                      </div>
                                  </div>
                              </motion.div>
                          ))
                      )}
                  </div>
              </motion.div>
          )}

          {activeTab === 'notifications' && (
              <div className="space-y-4">
                  <div className="flex justify-end mb-4">
                       <div className="relative">
                            <button
                                onClick={() => setIsNotifSortOpen(!isNotifSortOpen)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium text-sm text-gray-700 dark:text-gray-200"
                            >
                                <Filter size={16} className="text-gray-500" />
                                <span>
                                    {notificationSort === 'date' ? t('admin.notifications.sort.date') : t('admin.notifications.sort.read')}
                                </span>
                                <div className={`transition-transform duration-200 ${isNotifSortOpen ? 'rotate-180' : ''}`}>
                                    <ChevronDown size={16} />
                                </div>
                            </button>

                            <AnimatePresence>
                                {isNotifSortOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setIsNotifSortOpen(false)} 
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden"
                                        >
                                            <div className="p-2 space-y-1">
                                                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    {t('admin.notifications.sort.label')}
                                                </div>
                                                
                                                {[
                                                    { id: 'date', icon: Calendar, label: t('admin.notifications.sort.date') },
                                                    { id: 'read', icon: Check, label: t('admin.notifications.sort.read') }
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => {
                                                            setNotificationSort(opt.id as any)
                                                            setIsNotifSortOpen(false)
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                                            notificationSort === opt.id 
                                                                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-bold' 
                                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <opt.icon size={16} />
                                                            {opt.label}
                                                        </div>
                                                        {notificationSort === opt.id && <Check size={16} />}
                                                    </button>
                                                ))}
                                                
                                                <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
                                                
                                                <div className="flex gap-1 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                    <button
                                                        onClick={() => setNotificationSortOrder('asc')}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                            notificationSortOrder === 'asc'
                                                                ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                        }`}
                                                    >
                                                        <ArrowUp size={14} />
                                                        Asc
                                                    </button>
                                                    <button
                                                        onClick={() => setNotificationSortOrder('desc')}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                            notificationSortOrder === 'desc'
                                                                ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                        }`}
                                                    >
                                                        <ArrowDown size={14} />
                                                        Desc
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                       </div>
                  </div>

                  {sortedNotifications.map(note => (
                      <div key={note.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                              <img src={note.userAvatar || ''} className="h-10 w-10 rounded-full bg-gray-200" />
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white">{note.title}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{note.message}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                      Para: {note.userName} • {new Date(note.created).toLocaleString()}
                                  </p>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                              <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${note.read ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                  {note.read ? t('admin.notifications.read') : t('admin.notifications.unread')}
                              </span>
                          </div>
                      </div>
                  ))}
                  {sortedNotifications.length === 0 && <div className="text-center p-8 text-gray-500">{t('admin.notifications.empty')}</div>}
              </div>
          )}

          {activeTab === 'banned' && (
              <div className="grid grid-cols-1 gap-4">
                   {bannedUsers.map(user => (
                       <div key={user.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="flex items-center gap-4 w-full">
                              <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="h-12 w-12 rounded-full bg-gray-200" onError={(e) => e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png'} />
                              <div>
                                  <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                      {user.username || user.id}
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                          (user.banLevel === 1) ? 'bg-yellow-100 text-yellow-600' :
                                          (user.banLevel === 2) ? 'bg-orange-100 text-orange-600' :
                                          'bg-red-100 text-red-600'
                                      }`}>
                                          {t('admin.banned.level')} {user.banLevel || 2}
                                      </span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                      {t('admin.banned.expires')}: {user.banExpires ? new Date(user.banExpires).toLocaleString() : t('admin.banned.permanent')}
                                      {user.banExpires && user.banExpires > Date.now() && (
                                          <span className="ml-2 font-bold text-orange-500">
                                              ({t('admin.banned.remaining')} {getTimeLeft(user.banExpires)})
                                          </span>
                                      )}
                                  </p>
                                  <p className="text-sm text-red-500 mt-1 italic">"{user.banReason || t('admin.banned.legacy')}"</p>
                              </div>
                          </div>
                          <button
                              onClick={() => setConfirmAction({ action: 'unban_user', targetUserId: user.id, offenderName: user.username || user.id })}
                              className="w-full md:w-auto px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 transition-colors whitespace-nowrap"
                          >
                              {t('admin.banned.revoke')}
                          </button>
                       </div>
                   ))}
                   {bannedUsers.length === 0 && (
                       <div className="text-center p-12 text-gray-500 bg-white dark:bg-gray-900 rounded-xl">{t('admin.banned.empty')}</div>
                   )}
              </div>
          )}

          {activeTab === 'history' && (
              <div className="space-y-6">
                  {!selectedUser ? (
                      // User List View
                      <>
                          <div className="flex gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm">
                              <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <input 
                                      type="text" 
                                      placeholder={t('admin.history.search')} 
                                      value={historySearchId}
                                      onChange={(e) => setHistorySearchId(e.target.value)}
                                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                              </div>
                          </div>

                          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                              <table className="w-full text-left text-sm">
                                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                                      <tr>
                                          <th className="px-6 py-4">{t('admin.history.headers.user')}</th>
                                          <th className="px-6 py-4 text-center">{t('admin.history.headers.warns')}</th>
                                          <th className="px-6 py-4 text-center">{t('admin.history.headers.bans')}</th>
                                          <th className="px-6 py-4">{t('admin.history.headers.lastInfraction')}</th>
                                          <th className="px-6 py-4 text-right"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                      {sortedHistoryUsers.map(u => (
                                          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => handleUserSelect(u)}>
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-3">
                                                      <img src={u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} className="h-10 w-10 rounded-full" onError={(e) => e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png'} />
                                                      <div>
                                                          <p className="font-bold text-gray-900 dark:text-white">{u.username}</p>
                                                          <p className="text-xs text-gray-400 font-mono">{u.id}</p>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <span className={`px-2 py-1 rounded-lg font-bold text-xs ${u.warns > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                      {u.warns}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  {u.banned ? (
                                                      <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700 font-bold text-xs">BANNED</span>
                                                  ) : (
                                                      <span className="text-gray-400">-</span>
                                                  )}
                                              </td>
                                              <td className="px-6 py-4 text-gray-500">
                                                  {u.lastInfraction > 0 ? new Date(u.lastInfraction).toLocaleDateString() : '-'}
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                  <ChevronRight size={20} className="text-gray-400" />
                                              </td>
                                          </tr>
                                      ))}
                                      {sortedHistoryUsers.length === 0 && (
                                          <tr>
                                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                  {t('admin.history.empty')}
                                              </td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </>
                  ) : (
                      // Detailed View
                      <div className="space-y-6">
                          <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <ChevronRight className="rotate-180" size={20} />
                              {t('admin.history.back')}
                          </button>

                          {/* User Header */}
                          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-6 items-center">
                              <img src={selectedUser.avatar ? `https://cdn.discordapp.com/avatars/${selectedUser.id}/${selectedUser.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} className="h-24 w-24 rounded-full" onError={(e) => e.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png'} />
                              <div className="flex-1 text-center md:text-left">
                                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">{selectedUser.username}</h2>
                                  <p className="text-gray-500 font-mono">{selectedUser.id}</p>
                                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                                       <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedUser.banned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                           {selectedUser.banned ? 'Banned' : 'Active'}
                                       </span>
                                       {selectedUser.muted && (
                                           <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-100 text-orange-600">Muted</span>
                                       )}
                                       <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-yellow-100 text-yellow-600">
                                           {selectedUser.warns} Warns
                                       </span>
                                  </div>
                              </div>
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                   <button 
                                       onClick={() => setConfirmAction({ action: 'ban_user', targetUserId: selectedUser.id, offenderName: selectedUser.username })}
                                       className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                   >
                                       {t('admin.reports.actions.ban')}
                                   </button>
                                   <button 
                                       onClick={() => setConfirmAction({ action: 'warn_user', targetUserId: selectedUser.id, offenderName: selectedUser.username })}
                                       className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition-colors"
                                   >
                                       {t('admin.reports.actions.warn')}
                                   </button>
                              </div>
                          </div>

                          {/* History Lists */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Warns */}
                              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                      <AlertTriangle className="text-yellow-500" />
                                      Warns
                                  </h3>
                                  <div className="space-y-4">
                                      {userHistory.filter(h => h.type === 'warn').map(h => (
                                          <div key={h.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                              <p className="font-bold text-sm text-gray-900 dark:text-white">{h.title}</p>
                                              <p className="text-xs text-gray-500 mb-2">{new Date(h.created).toLocaleString()}</p>
                                              <p className="text-sm text-gray-600 dark:text-gray-300">{h.message}</p>
                                          </div>
                                      ))}
                                      {userHistory.filter(h => h.type === 'warn').length === 0 && (
                                          <p className="text-center text-gray-400 py-4">No warns recorded</p>
                                      )}
                                  </div>
                              </div>

                              {/* Bans & Mutes */}
                              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                      <Shield className="text-red-500" />
                                      Bans & Mutes
                                  </h3>
                                  <div className="space-y-4">
                                      {userHistory.filter(h => h.type === 'ban' || h.type === 'mute' || h.type === 'unban').map(h => (
                                          <div key={h.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-l-4 border-red-500">
                                              <div className="flex justify-between items-center mb-1">
                                                  <p className="font-bold text-sm text-gray-900 dark:text-white uppercase">{h.type}</p>
                                                  <p className="text-xs text-gray-500">{new Date(h.created).toLocaleString()}</p>
                                              </div>
                                              <p className="text-sm text-gray-600 dark:text-gray-300">{h.message}</p>
                                          </div>
                                      ))}
                                      {userHistory.filter(h => h.type === 'ban' || h.type === 'mute' || h.type === 'unban').length === 0 && (
                                          <p className="text-center text-gray-400 py-4">No bans/mutes recorded</p>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'servers' && (
              <div className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input 
                              type="text" 
                              placeholder={t('admin.servers.search')} 
                              value={guildSearchQuery}
                              onChange={(e) => setGuildSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                      </div>
                      
                      <div className="relative">
                          <button
                              onClick={() => setIsSortOpen(!isSortOpen)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium text-sm text-gray-700 dark:text-gray-200"
                          >
                              <Filter size={16} className="text-gray-500" />
                              <span>
                                  {guildSort === 'members' ? t('admin.servers.sort.members') :
                                  guildSort === 'name' ? t('admin.servers.sort.name') :
                                  guildSort === 'joined' ? t('admin.servers.sort.joined') :
                                  t('admin.servers.sort.created')}
                              </span>
                              <div className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`}>
                                  <ChevronDown size={16} />
                              </div>
                          </button>

                          <AnimatePresence>
                              {isSortOpen && (
                                  <>
                                      <div 
                                          className="fixed inset-0 z-10" 
                                          onClick={() => setIsSortOpen(false)} 
                                      />
                                      <motion.div
                                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden"
                                      >
                                          <div className="p-2 space-y-1">
                                              <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                  {t('admin.servers.sort.label')}
                                              </div>
                                              
                                              {[
                                                  { id: 'members', icon: Users, label: t('admin.servers.sort.members') },
                                                  { id: 'name', icon: LayoutGrid, label: t('admin.servers.sort.name') },
                                                  { id: 'joined', icon: Calendar, label: t('admin.servers.sort.joined') },
                                                  { id: 'created', icon: Clock, label: t('admin.servers.sort.created') }
                                              ].map((opt) => (
                                                  <button
                                                      key={opt.id}
                                                      onClick={() => {
                                                          setGuildSort(opt.id as any)
                                                          setIsSortOpen(false)
                                                      }}
                                                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                                          guildSort === opt.id 
                                                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-bold' 
                                                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                      }`}
                                                  >
                                                      <div className="flex items-center gap-3">
                                                          <opt.icon size={16} />
                                                          {opt.label}
                                                      </div>
                                                      {guildSort === opt.id && <Check size={16} />}
                                                  </button>
                                              ))}
                                              
                                              <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
                                              
                                              <div className="flex gap-1 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                  <button
                                                      onClick={() => setGuildSortOrder('asc')}
                                                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                          guildSortOrder === 'asc'
                                                              ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                                                              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                      }`}
                                                  >
                                                      <ArrowUp size={14} />
                                                      Asc
                                                  </button>
                                                  <button
                                                      onClick={() => setGuildSortOrder('desc')}
                                                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                          guildSortOrder === 'desc'
                                                              ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                                                              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                      }`}
                                                  >
                                                      <ArrowDown size={14} />
                                                      Desc
                                                  </button>
                                              </div>
                                          </div>
                                      </motion.div>
                                  </>
                              )}
                          </AnimatePresence>
                      </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs">
                                  <tr>
                                      <th className="px-6 py-4">{t('admin.servers.headers.name')}</th>
                                      <th className="px-6 py-4">{t('admin.servers.headers.members')}</th>
                                      <th className="px-6 py-4">{t('admin.servers.headers.owner')}</th>
                                      <th className="px-6 py-4">{t('admin.servers.headers.created')}</th>
                                      <th className="px-6 py-4">{t('admin.servers.headers.joined')}</th>
                                      <th className="px-6 py-4">{t('admin.servers.headers.status')}</th>
                                      <th className="px-6 py-4 text-right"></th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                  {sortedGuilds.map((guild) => (
                                      <tr key={guild.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                  {guild.icon ? (
                                                      <img src={guild.icon} className="h-10 w-10 rounded-full" alt="" />
                                                  ) : (
                                                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500">
                                                          {guild.name.substring(0, 2).toUpperCase()}
                                                      </div>
                                                  )}
                                                  <div>
                                                      <p className="font-bold text-gray-900 dark:text-white">{guild.name}</p>
                                                      <p className="text-xs text-gray-400 font-mono">{guild.id}</p>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 font-medium text-gray-600 dark:text-gray-300">
                                              {guild.memberCount.toLocaleString()}
                                          </td>
                                          <td className="px-6 py-4">
                                              <div>
                                                  <p className="font-bold text-gray-900 dark:text-white text-xs">{guild.ownerName}</p>
                                                  <p className="text-xs text-gray-400 font-mono">{guild.ownerId}</p>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-gray-500">
                                              {new Date(guild.createdAt).toLocaleDateString()}
                                          </td>
                                          <td className="px-6 py-4 text-gray-500">
                                              {new Date(guild.joinedAt).toLocaleDateString()}
                                          </td>
                                          <td className="px-6 py-4">
                                              {guild.isPlaying ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">
                                                      <Music size={12} className="animate-pulse" />
                                                      {t('admin.servers.playing')}
                                                  </span>
                                              ) : (
                                                  <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs font-bold">
                                                      {t('admin.servers.idle')}
                                                  </span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button 
                                                  onClick={() => {
                                                      setLeaveReason('')
                                                      setConfirmAction({ action: 'leave_guild', guildId: guild.id, guildName: guild.name })
                                                  }}
                                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                  title={t('admin.servers.actions.leave')}
                                              >
                                                  <XCircle size={20} />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                                  {sortedGuilds.length === 0 && (
                                      <tr>
                                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                              {t('admin.servers.empty')}
                                          </td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* Confirm Modal */}
          <AnimatePresence>
              {confirmAction && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                      <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setConfirmAction(null)}
                          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      />
                      <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                      >
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                              {confirmAction.action === 'dismiss' ? t('admin.modal.dismiss') : 
                               confirmAction.action === 'restore' ? t('admin.modal.restore') : 
                               confirmAction.action === 'ban_user' ? t('admin.modal.ban') :
                               confirmAction.action === 'mute_user' ? t('admin.modal.mute') :
                               confirmAction.action === 'warn_user' ? t('admin.modal.warn') :
                               confirmAction.action === 'unban_user' ? t('admin.modal.unban') :
                               confirmAction.action === 'leave_guild' ? t('admin.servers.modal.leaveTitle') :
                               t('admin.modal.delete')}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                              {confirmAction.action === 'dismiss' 
                                  ? 'El reporte se archivará como falso positivo. El comentario será visible si no tiene otros reportes.' 
                                  : confirmAction.action === 'restore'
                                  ? 'El reporte volverá a estado pendiente y se reevaluará la visibilidad del comentario.'
                                  : confirmAction.action === 'ban_user'
                                  ? `¿Estás seguro de querer banear a ${confirmAction.offenderName}? No podrá usar ninguna función del bot.`
                                  : confirmAction.action === 'warn_user'
                                  ? `Se registrará una advertencia para ${confirmAction.offenderName}.`
                                  : confirmAction.action === 'mute_user'
                                  ? `El usuario ${confirmAction.offenderName} no podrá comentar temporalmente.`
                                  : confirmAction.action === 'unban_user'
                                  ? `Se eliminará la suspensión de ${confirmAction.offenderName} y podrá acceder nuevamente.`
                                  : confirmAction.action === 'leave_guild'
                                  ? t('admin.servers.modal.leaveConfirm')
                                  : 'Esta acción es irreversible. El comentario se eliminará y el reporte se marcará como resuelto.'}
                          </p>

                          {confirmAction.action === 'leave_guild' && (
                              <div className="mb-6">
                                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('admin.servers.modal.reasonLabel')}</label>
                                  <textarea
                                      value={leaveReason}
                                      onChange={(e) => setLeaveReason(e.target.value)}
                                      placeholder={t('admin.servers.modal.reasonPlaceholder')}
                                      className="w-full rounded-lg border-gray-200 bg-gray-50 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white h-24 resize-none"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">{t('admin.servers.modal.reasonHelp')}</p>
                              </div>
                          )}

                          {confirmAction.action === 'ban_user' && (
                              <div className="space-y-4 mb-6">
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nivel de Baneo</label>
                                      <div className="relative">
                                          <button
                                              onClick={() => setIsBanLevelOpen(!isBanLevelOpen)}
                                              className="w-full flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm focus:border-primary-500 focus:outline-none dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                          >
                                              <span className="truncate">
                                                  {banLevel === 1 ? 'Nivel 1: Restricción (Sin comentarios/playlists)' :
                                                   banLevel === 2 ? 'Nivel 2: Bloqueo de Dashboard' :
                                                   'Nivel 3: Blacklist Total (Bot + Web)'}
                                              </span>
                                              <div className={`transition-transform duration-200 ${isBanLevelOpen ? 'rotate-180' : ''}`}>
                                                  <ChevronDown size={16} className="text-gray-500" />
                                              </div>
                                          </button>
                                          <AnimatePresence>
                                              {isBanLevelOpen && (
                                                  <>
                                                      <div className="fixed inset-0 z-10" onClick={() => setIsBanLevelOpen(false)} />
                                                      <motion.div
                                                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden"
                                                      >
                                                          <div className="p-1 space-y-1">
                                                              {[
                                                                  { val: 1, label: 'Nivel 1: Restricción (Sin comentarios/playlists)' },
                                                                  { val: 2, label: 'Nivel 2: Bloqueo de Dashboard' },
                                                                  { val: 3, label: 'Nivel 3: Blacklist Total (Bot + Web)' }
                                                              ].map((opt) => (
                                                                  <button
                                                                      key={opt.val}
                                                                      onClick={() => {
                                                                          setBanLevel(opt.val)
                                                                          setIsBanLevelOpen(false)
                                                                      }}
                                                                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                          banLevel === opt.val
                                                                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-bold'
                                                                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                      }`}
                                                                  >
                                                                      {opt.label}
                                                                  </button>
                                                              ))}
                                                          </div>
                                                      </motion.div>
                                                  </>
                                              )}
                                          </AnimatePresence>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Duración</label>
                                      <div className="relative">
                                          <button
                                              onClick={() => setIsBanDurationOpen(!isBanDurationOpen)}
                                              className="w-full flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm focus:border-primary-500 focus:outline-none dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                          >
                                              <span className="truncate">
                                                  {muteDuration === 24 ? '24 Horas' :
                                                   muteDuration === 72 ? '3 Días' :
                                                   muteDuration === 168 ? '1 Semana' :
                                                   muteDuration === 720 ? '1 Mes' :
                                                   'Permanente'}
                                              </span>
                                              <div className={`transition-transform duration-200 ${isBanDurationOpen ? 'rotate-180' : ''}`}>
                                                  <ChevronDown size={16} className="text-gray-500" />
                                              </div>
                                          </button>
                                          <AnimatePresence>
                                              {isBanDurationOpen && (
                                                  <>
                                                      <div className="fixed inset-0 z-10" onClick={() => setIsBanDurationOpen(false)} />
                                                      <motion.div
                                                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden max-h-60 overflow-y-auto"
                                                      >
                                                          <div className="p-1 space-y-1">
                                                              {[
                                                                  { val: 24, label: '24 Horas' },
                                                                  { val: 72, label: '3 Días' },
                                                                  { val: 168, label: '1 Semana' },
                                                                  { val: 720, label: '1 Mes' },
                                                                  { val: 0, label: 'Permanente' }
                                                              ].map((opt) => (
                                                                  <button
                                                                      key={opt.val}
                                                                      onClick={() => {
                                                                          setMuteDuration(opt.val)
                                                                          setIsBanDurationOpen(false)
                                                                      }}
                                                                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                          muteDuration === opt.val
                                                                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-bold'
                                                                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                      }`}
                                                                  >
                                                                      {opt.label}
                                                                  </button>
                                                              ))}
                                                          </div>
                                                      </motion.div>
                                                  </>
                                              )}
                                          </AnimatePresence>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Motivo</label>
                                      <textarea
                                          value={banReason}
                                          onChange={(e) => setBanReason(e.target.value)}
                                          placeholder="Explica la razón del baneo..."
                                          className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white h-24 resize-none"
                                      />
                                  </div>
                              </div>
                          )}

                          {confirmAction.action === 'mute_user' && (
                              <div className="mb-6">
                                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Duración (Horas)</label>
                                  <div className="relative">
                                      <button
                                          onClick={() => setIsMuteDurationOpen(!isMuteDurationOpen)}
                                          className="w-full flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm focus:border-primary-500 focus:outline-none dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                      >
                                          <span className="truncate">
                                              {muteDuration === 1 ? '1 Hora' :
                                               muteDuration === 6 ? '6 Horas' :
                                               muteDuration === 12 ? '12 Horas' :
                                               muteDuration === 24 ? '24 Horas' :
                                               muteDuration === 168 ? '1 Semana' :
                                               'Indefinido'}
                                          </span>
                                          <div className={`transition-transform duration-200 ${isMuteDurationOpen ? 'rotate-180' : ''}`}>
                                              <ChevronDown size={16} className="text-gray-500" />
                                          </div>
                                      </button>
                                      <AnimatePresence>
                                          {isMuteDurationOpen && (
                                              <>
                                                  <div className="fixed inset-0 z-10" onClick={() => setIsMuteDurationOpen(false)} />
                                                  <motion.div
                                                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden max-h-60 overflow-y-auto"
                                                  >
                                                      <div className="p-1 space-y-1">
                                                          {[
                                                              { val: 1, label: '1 Hora' },
                                                              { val: 6, label: '6 Horas' },
                                                              { val: 12, label: '12 Horas' },
                                                              { val: 24, label: '24 Horas' },
                                                              { val: 168, label: '1 Semana' },
                                                              { val: 0, label: 'Indefinido' }
                                                          ].map((opt) => (
                                                              <button
                                                                  key={opt.val}
                                                                  onClick={() => {
                                                                      setMuteDuration(opt.val)
                                                                      setIsMuteDurationOpen(false)
                                                                  }}
                                                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                      muteDuration === opt.val
                                                                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-bold'
                                                                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                  }`}
                                                              >
                                                                  {opt.label}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  </motion.div>
                                              </>
                                          )}
                                      </AnimatePresence>
                                  </div>
                              </div>
                          )}

                          <div className="flex justify-end gap-3">
                              <button 
                                  onClick={() => setConfirmAction(null)}
                                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                              >
                                  {t('admin.modal.cancel')}
                              </button>
                              <button 
                                  onClick={executeAction}
                                  className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg ${
                                      confirmAction.action === 'delete_comment' 
                                          ? 'bg-red-600 hover:bg-red-700'
                                          : 'bg-primary-600 hover:bg-primary-700'
                                  }`}
                              >
                                  {t('admin.modal.confirm')}
                              </button>
                          </div>
                      </motion.div>
                  </div>
              )}
          </AnimatePresence>
      </div>
  )
}

function StatCard({ icon, label, value, subValue, color }: any) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    }

    return (
        <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="mt-2 text-3xl font-black text-gray-900 dark:text-white">{value}</p>
                    {subValue && <p className="mt-1 text-xs font-medium text-gray-400">{subValue}</p>}
                </div>
                <div className={`rounded-xl p-4 ${(colors as any)[color] || colors.blue}`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}