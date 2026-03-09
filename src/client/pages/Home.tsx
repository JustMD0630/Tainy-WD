import { motion, AnimatePresence } from 'framer-motion'
import { Music, Shield, Zap, Heart, Server, Github, ArrowRight, Disc, Bell, X, Check, AlertTriangle, Info, Globe, ChevronDown, LayoutGrid, LogOut, User } from 'lucide-react'
import GlowBackground from '@/components/layout/GlowBackground'
import { useAuthStore } from '@/stores/auth'
import { useBotStore } from '@/stores/bot'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import NotificationBell from '@/components/NotificationBell'
import { useTranslation } from 'react-i18next'

export default function Home() {
  const { user } = useAuthStore()
  const { info: botInfo, fetchInfo } = useBotStore()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { logout } = useAuthStore()
  const [langOpen, setLangOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  useEffect(() => {
    fetchInfo()
  }, [fetchInfo])

  const toggleLang = () => {
    // Check if current language starts with 'es' (e.g., 'es', 'es-ES', 'es-MX')
    const isSpanish = i18n.language.startsWith('es')
    const newLang = isSpanish ? 'en' : 'es'
    i18n.changeLanguage(newLang)
  }

  const features = [
    {
      icon: <Music className="w-6 h-6 text-indigo-400" />,
      title: t('home.features.quality.title'),
      desc: t('home.features.quality.desc'),
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: t('home.features.fast.title'),
      desc: t('home.features.fast.desc'),
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-400" />,
      title: t('home.features.secure.title'),
      desc: t('home.features.secure.desc'),
    },
    {
      icon: <Heart className="w-6 h-6 text-rose-400" />,
      title: t('home.features.easy.title'),
      desc: t('home.features.easy.desc'),
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f1014] text-slate-100 font-sans selection:bg-indigo-500/30">
      <GlowBackground />

      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-50 blur transition duration-500 group-hover:opacity-100" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e1f22] text-white overflow-hidden ring-1 ring-white/10">
                {botInfo?.avatar ? (
                <img 
                    src={botInfo.avatar}
                    alt="Tainy Logo"
                    className="h-full w-full object-cover"
                />
                ) : (
                <Music size={20} className="text-indigo-400" />
                )}
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">{botInfo?.username || 'Tainy'}</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Language Switcher */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold uppercase text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Globe size={14} />
            {i18n.language.startsWith('es') ? 'ES' : 'EN'}
          </button>

          {/* Notification Bell */}
          {user && <NotificationBell />}
          
          {user ? (
            <div className="relative pl-4 border-l border-white/10">
                <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 transition-opacity hover:opacity-80 focus:outline-none"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white">{user.username}</p>
                        <p className="text-xs text-slate-400">{t('home.nav.user')}</p>
                    </div>
                    {user.avatar ? (
                        <img 
                            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                            alt={user.username}
                            className="h-10 w-10 rounded-full border-2 border-white/10 object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white border-2 border-white/10">
                            <User size={20} />
                        </div>
                    )}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {userMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#1e1f22] border border-white/10 p-1 shadow-2xl z-50"
                        >
                            <button
                                onClick={() => navigate('/select-guild')}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                            >
                                <LayoutGrid size={16} className="text-indigo-400" />
                                {t('home.nav.dashboard')}
                            </button>
                            <button
                                onClick={() => {
                                    logout()
                                    setUserMenuOpen(false)
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={16} />
                                {t('sidebar.logout')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          ) : (
            <a
                href="/v1/auth/login"
                className="flex items-center gap-2 rounded-xl bg-[#5865F2] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/20 transition-all hover:bg-[#4752c4] hover:scale-105 active:scale-95"
            >
                {t('home.nav.login')}
            </a>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-32 lg:pt-32">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                {t('home.hero.badge')}
            </div>
            <h1 className="mb-6 text-5xl font-black leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
              {t('home.hero.title1')} <br />
              {t('home.hero.title2')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">{t('home.hero.title3')}</span>
            </h1>
            <p className="mb-8 max-w-lg text-lg text-slate-400 leading-relaxed">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="/v1/auth/login"
                className="group flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-black shadow-xl shadow-white/10 transition-all hover:bg-slate-200 hover:-translate-y-1"
              >
                {t('home.hero.ctaLogin')}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#features"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#1e1f22] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#2b2d31] hover:border-white/20"
              >
                {t('home.hero.ctaFeatures')}
              </a>
            </div>
            
            <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-8 w-8 rounded-full border-2 border-[#0f1014] bg-slate-700"></div>
                    ))}
                </div>
                <p>{t('home.hero.stats', { count: 20 })}</p>
            </div>
          </motion.div>

          {/* Hero Illustration (Mockup) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block perspective-1000"
          >
            <div className="relative z-10 transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-500 hover:rotate-0">
                {/* Floating Elements */}
                <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-12 -right-8 z-20 rounded-2xl bg-[#1e1f22] p-4 shadow-2xl border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <Disc className="text-white animate-spin-slow" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Now Playing</p>
                            <p className="text-sm font-bold text-white">Midnight City</p>
                        </div>
                        <div className="ml-2 flex gap-1">
                            <div className="h-4 w-1 bg-indigo-500 rounded-full animate-music-bar-1"></div>
                            <div className="h-6 w-1 bg-indigo-500 rounded-full animate-music-bar-2"></div>
                            <div className="h-3 w-1 bg-indigo-500 rounded-full animate-music-bar-3"></div>
                        </div>
                    </div>
                </motion.div>

                <div className="rounded-3xl bg-[#18191c] p-2 shadow-2xl ring-1 ring-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl">
                <div className="overflow-hidden rounded-2xl bg-[#0f1014] border border-white/5">
                    {/* Fake Browser Header */}
                    <div className="flex items-center gap-2 border-b border-white/5 bg-[#18191c] px-4 py-3">
                    <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-rose-500/50" />
                        <div className="h-3 w-3 rounded-full bg-amber-500/50" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="mx-auto flex h-6 w-64 items-center justify-center rounded-md bg-[#0f1014] text-[10px] text-slate-600 font-mono">
                        tainy.bot/dashboard
                    </div>
                    </div>
                    {/* Fake Dashboard Content */}
                    <div className="p-6">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">
                            {user ? (
                                <>
                                    {t('home.welcomeBack')} <span className="text-indigo-400">{user.username}</span>
                                </>
                            ) : (
                                t('home.welcome')
                            )}
                        </h2>
                        <p className="text-slate-500 text-sm">{t('home.activitySummary')}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="rounded-xl bg-[#18191c] p-4 border border-white/5">
                            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                                <Music size={18} />
                            </div>
                            <div className="h-2 w-12 rounded bg-white/10 mb-2" />
                            <div className="h-6 w-8 rounded bg-white/20" />
                        </div>
                        <div className="rounded-xl bg-[#18191c] p-4 border border-white/5">
                            <div className="h-8 w-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                                <Heart size={18} />
                            </div>
                            <div className="h-2 w-12 rounded bg-white/10 mb-2" />
                            <div className="h-6 w-8 rounded bg-white/20" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-[#18191c] p-3 border border-white/5">
                            <div className="h-10 w-10 rounded-lg bg-white/5" />
                            <div className="flex-1">
                                <div className="mb-2 h-3 w-24 rounded bg-white/10" />
                                <div className="h-2 w-16 rounded bg-white/5" />
                            </div>
                            <div className="h-8 w-8 rounded-full bg-white/5" />
                        </div>
                        ))}
                    </div>
                    </div>
                </div>
                </div>
            </div>

            {/* Decorative Elements behind */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[100px]" />
          </motion.div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-32 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f1014] via-transparent to-[#0f1014] z-0 pointer-events-none" />
            <div className="text-center mb-16 relative z-10">
                <h2 className="text-3xl font-black text-white md:text-4xl">{t('home.features.title')}</h2>
                <p className="mt-4 text-slate-400">{t('home.features.subtitle')}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
                {features.map((f, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group rounded-3xl bg-[#18191c] p-8 transition-all hover:-translate-y-2 hover:bg-[#1e1f22] border border-white/5 hover:border-indigo-500/20"
                >
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f1014] transition-colors group-hover:scale-110 shadow-lg shadow-black/20">
                    {f.icon}
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
                </motion.div>
                ))}
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0f1014] relative z-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white overflow-hidden">
                {botInfo?.avatar ? (
                  <img 
                      src={botInfo.avatar}
                      alt="Tainy Logo"
                      className="h-full w-full object-cover"
                  />
                ) : (
                  <Music size={16} fill="currentColor" />
                )}
            </div>
            <span className="font-bold text-white text-lg">{botInfo?.username || 'Tainy'}</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">{t('home.footer.terms')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('home.footer.privacy')}</a>
              <a href="#" className="hover:text-white transition-colors">{t('home.footer.support')}</a>
          </div>
          <p className="text-sm text-slate-500">© 2026 {botInfo?.username || 'Tainy'}. {t('home.footer.copyright')}</p>
        </div>
      </footer>
    </div>
  )
}
