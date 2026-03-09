
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Settings, LogOut, Disc, Music, User, Globe, Shield, Menu, X } from 'lucide-react'
import GlowBackground from '@/components/layout/GlowBackground'
import NotificationBell from '@/components/NotificationBell'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import { usePlayerStore } from '@/stores/player'
import { useBotStore } from '@/stores/bot'
import { useNotificationStore } from '@/stores/notification'
import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'

function NavItem({ to, label, icon, onClick }: { to: string; label: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/10 dark:text-primary-400'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
        ].join(' ')
      }
    >
      <span
        className={({ isActive }: { isActive: boolean }) =>
          isActive
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
        }
      >
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const { load, config } = useConfigStore()
  const { setContext, connectWs, disconnectWs, guildId } = usePlayerStore()
  const { info: botInfo, fetchInfo: fetchBotInfo } = useBotStore()
  const { fetchNotifications } = useNotificationStore()
  const { theme, setTheme } = useTheme()
  const [guildName, setGuildName] = useState('Seleccionando...')
  const [isGuildAdmin, setIsGuildAdmin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    fetchBotInfo()
  }, [fetchBotInfo])

  // Notification Polling
  useEffect(() => {
      if (user) {
          fetchNotifications(user.id)
          const interval = setInterval(() => {
              fetchNotifications(user.id)
          }, 10000) // Poll every 10s
          return () => clearInterval(interval)
      }
  }, [user, fetchNotifications])

  // WebSocket Connection Management (Persistent across sub-pages)
  useEffect(() => {
    if (guildId) {
        connectWs()
    }
    return () => {
        disconnectWs()
    }
  }, [guildId, connectWs, disconnectWs])

  useEffect(() => {
    load()
    const storedGuildId = localStorage.getItem('selected_guild')
    const storedGuildName = localStorage.getItem('selected_guild_name')
    const storedPerms = localStorage.getItem('guild_permissions')

    const currentUserId = user?.id || config.defaultUserId

    if (storedGuildId) {
      setGuildName(storedGuildName || storedGuildId)
      
      if (storedPerms) {
          try {
              const p = BigInt(storedPerms)
              setIsGuildAdmin((p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20))
          } catch (e) {
              setIsGuildAdmin(false)
          }
      } else {
          setIsGuildAdmin(false)
      }
      
      if (currentUserId) {
        setContext(storedGuildId, currentUserId)
      }
    }
  }, [load, user, config.defaultUserId, setContext])

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  const SidebarContent = () => (
    <>
      {/* Logo Area */}
      <div 
        className="mb-8 flex items-center gap-3 px-2 cursor-pointer"
        onClick={() => {
            navigate('/')
            closeMobileMenu()
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-600/20 overflow-hidden">
            {botInfo?.avatar ? (
              <img 
                  src={botInfo.avatar}
                  alt="Tainy Logo"
                  className="h-full w-full object-cover"
              />
            ) : (
              <Music size={20} fill="currentColor" />
            )}
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-none text-gray-900 dark:text-white">
            {botInfo?.username || 'Tainy'}
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Dashboard
          </span>
        </div>
      </div>

      {/* User / Guild Context */}
      <div className="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
              className="h-10 w-10 rounded-lg bg-gray-200 object-cover dark:bg-gray-700"
              alt=""
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              <User size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-gray-900 dark:text-white">
              {guildName}
            </div>
            <div className="truncate text-xs text-gray-500 dark:text-gray-400">
              {user?.username || 'Usuario'}
            </div>
          </div>
          <div className="flex-shrink-0">
              <NotificationBell align="left" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        <div className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t('sidebar.menu')}
        </div>
        <NavItem to="/dashboard" label={t('sidebar.dashboard')} icon={<LayoutGrid className="h-5 w-5" />} onClick={closeMobileMenu} />
        <NavItem to="/profile" label={t('sidebar.profile')} icon={<User className="h-5 w-5" />} onClick={closeMobileMenu} />
        <NavItem to="/library" label={t('sidebar.library')} icon={<Disc className="h-5 w-5" />} onClick={closeMobileMenu} />
        <NavItem to="/explore" label={t('sidebar.explore')} icon={<Globe className="h-5 w-5" />} onClick={closeMobileMenu} />

        {(user && (config.botOwnerId === user.id || (config.botAdmins || []).includes(user.id))) && (
          <NavItem to="/admin" label={t('sidebar.admin')} icon={<Shield className="h-5 w-5" />} onClick={closeMobileMenu} />
        )}

        <div className="mb-2 mt-8 px-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t('sidebar.adjustments')}
        </div>
        <NavItem to="/settings" label={t('sidebar.settings')} icon={<Settings className="h-5 w-5" />} onClick={closeMobileMenu} />
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto space-y-2 border-t border-gray-100 pt-6 dark:border-gray-800">
        <button
          type="button"
          onClick={() => {
              navigate('/select-guild')
              closeMobileMenu()
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <LayoutGrid className="h-5 w-5" />
          {t('sidebar.changeServer')}
        </button>

        <button
          type="button"
          onClick={async () => {
            logout()
            navigate('/')
            closeMobileMenu()
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/10 dark:hover:text-red-300"
        >
          <LogOut className="h-5 w-5" />
          {t('sidebar.logout')}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white">
      <GlowBackground />
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex items-center gap-3">
            <button onClick={toggleMobileMenu} className="p-1 text-gray-600 dark:text-gray-300">
                <Menu size={24} />
            </button>
            <span className="font-bold text-lg">{botInfo?.username || 'Tainy'}</span>
          </div>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-primary-100">
             {botInfo?.avatar && <img src={botInfo.avatar} className="h-full w-full object-cover" />}
          </div>
      </div>

      <div className="flex min-h-screen pt-16 md:pt-0">
        {/* Desktop Sidebar */}
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white/80 p-6 backdrop-blur-xl md:flex dark:border-gray-800 dark:bg-gray-900/80">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        <AnimatePresence>
            {mobileMenuOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeMobileMenu}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    />
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 z-50 h-screen w-[280px] flex-col border-r border-gray-200 bg-white p-6 shadow-2xl md:hidden dark:border-gray-800 dark:bg-gray-900"
                    >
                        <button 
                            onClick={closeMobileMenu}
                            className="absolute right-4 top-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            <X size={20} />
                        </button>
                        <SidebarContent />
                    </motion.aside>
                </>
            )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-8 md:ml-[280px] md:px-8">
          <motion.div
            key={location.pathname} // Add this to trigger animation on route change
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
