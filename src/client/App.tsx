import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import Library from '@/pages/Library'
import Explore from '@/pages/Explore'
import Settings from '@/pages/Settings'
import Admin from '@/pages/Admin'
import SelectGuild from '@/pages/SelectGuild'
import Banned from '@/pages/Banned'
import Profile from '@/pages/Profile'
import PublicProfile from '@/pages/PublicProfile'
import AppShell from '@/components/layout/AppShell'
import Toaster from '@/components/ui/Toaster'
import NotificationManager from '@/components/NotificationManager'
import { useAuthStore } from '@/stores/auth'
import { useBotStore } from '@/stores/bot'
import { useTheme } from '@/hooks/useTheme'
import { useTranslation } from 'react-i18next'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuthStore()
  if (status === 'loading') return null
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  
  if (user?.banLevel && user.banLevel >= 2) {
      if (!user.banExpires || user.banExpires > Date.now()) {
          return <Navigate to="/banned" replace />
      }
  }

  return <>{children}</>
}

export default function App() {
  const { fetchUser, setToken, user } = useAuthStore()
  const { info: botInfo, fetchInfo } = useBotStore()
  const { i18n } = useTranslation()
  useTheme()

  useEffect(() => {
    // Sync language with user preference
    if (user?.dashboardLanguage && user.dashboardLanguage !== i18n.language) {
      i18n.changeLanguage(user.dashboardLanguage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    // Check ban status globally
    if (user?.banLevel && user.banLevel >= 2) {
        const isPermanent = !user.banExpires || user.banExpires === 0
        const isActive = isPermanent || (user.banExpires && user.banExpires > Date.now())
        
        if (isActive) {
             if (window.location.pathname !== '/banned') {
                 window.location.href = '/banned'
             }
        }
    }
  }, [user])

  useEffect(() => {
    fetchInfo()
  }, [fetchInfo])

  useEffect(() => {
    if (botInfo?.avatar) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
      if (link) {
        link.href = botInfo.avatar
      }
      document.title = `${botInfo.username || 'Tainy'} Dashboard`
    }
  }, [botInfo])

  useEffect(() => {
    // Check for token in URL (from OAuth2 callback)
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      // Save token and clean URL
      setToken(token)
      // Stay on the current page (Home) instead of redirecting
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // Try to fetch user with existing token
      fetchUser()
    }
  }, [fetchUser, setToken])

  return (
    <Router>
      <Toaster />
      <NotificationManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/select-guild"
          element={
            <RequireAuth>
              <SelectGuild />
            </RequireAuth>
          }
        />
        <Route path="/banned" element={<Banned />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users/:userId" element={<PublicProfile />} />
          <Route path="/library" element={<Library />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
