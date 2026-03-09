import { motion } from 'framer-motion'
import { Shield, ExternalLink, LogOut, Clock } from 'lucide-react'
import GlowBackground from '@/components/layout/GlowBackground'
import { useAuthStore } from '@/stores/auth'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function Banned() {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [timeLeft, setTimeLeft] = useState<string>('')

    useEffect(() => {
        if (!user) return

        // If user is NOT banned, redirect to home
        if (!user.banned && (!user.banLevel || user.banLevel < 2)) {
            // Use window.location to ensure full reload and state clear
            window.location.href = '/'
        }
    }, [user])

    const isPermanent = !user?.banExpires || user?.banExpires === 0

    useEffect(() => {
        if (!user || isPermanent || !user.banExpires) return

        const updateTimer = () => {
            const now = Date.now()
            const diff = (user.banExpires || 0) - now
            
            if (diff <= 0) {
                setTimeLeft('Expirado - Por favor recarga la página')
                return
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [user, isPermanent])

    if (!user) return null
    if (!user.banned && (!user.banLevel || user.banLevel < 2)) return null

    const banLevel = user.banLevel || (user.banned ? 3 : 0)
    const banReason = user.banReason || (user.banned ? t('banned.legacy') : '')
    const expiresDate = user.banExpires ? new Date(user.banExpires).toLocaleString() : t('banned.permanent')

    return (
        <div className="min-h-screen bg-[#0f1014] text-slate-100 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <GlowBackground />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative z-10 max-w-lg w-full bg-[#1e1f22] rounded-3xl border border-red-500/20 shadow-2xl p-8 text-center"
            >
                <div className="mx-auto h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <Shield size={40} className="text-red-500" />
                </div>

                <h1 className="text-3xl font-black text-white mb-2">{t('banned.title')}</h1>
                <p className="text-red-400 font-bold uppercase tracking-wider text-sm mb-6">
                    {t('banned.subtitle')}
                </p>

                <div className="bg-[#18191c] rounded-xl p-6 text-left mb-8 border border-white/5">
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">{t('banned.reason')}</p>
                            <p className="text-slate-200">{banReason}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">{t('banned.expires')}</p>
                            <p className="text-slate-200">{expiresDate}</p>
                        </div>
                        {!isPermanent && timeLeft && (
                            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 p-2 rounded-lg">
                                <Clock size={16} />
                                <span className="text-sm font-mono font-bold">{timeLeft}</span>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">{t('banned.level')}</p>
                            <p className="text-slate-200">
                                {banLevel === 3 ? t('banned.level3') : t('banned.level2')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <a 
                        href="https://discord.gg/support" 
                        target="_blank" 
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {t('banned.appeal')} <ExternalLink size={18} />
                    </a>
                    <button 
                        onClick={() => {
                            logout()
                            navigate('/')
                        }}
                        className="w-full py-3 rounded-xl bg-[#2b2d31] hover:bg-[#313338] text-slate-300 font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {t('banned.logout')} <LogOut size={18} />
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
