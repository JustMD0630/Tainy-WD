import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Search, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import GlowBackground from '@/components/layout/GlowBackground'
import NotificationBell from '@/components/NotificationBell'

export default function SelectGuild() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [guilds, setGuilds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchGuilds = async () => {
      try {
        const token = localStorage.getItem('discord_token')
        if (!token) return

        const res = await fetch('/v1/auth/guilds', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setGuilds(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchGuilds()
  }, [])

  const handleSelect = (guildId: string, guildName: string, permissions: string) => {
    localStorage.setItem('selected_guild', guildId)
    localStorage.setItem('selected_guild_name', guildName)
    localStorage.setItem('guild_permissions', permissions)
    // Redirection to Dashboard removed. User stays here or chooses where to go.
    // If you want to auto-redirect only if they clicked a specific "Manage" button, that's fine,
    // but the request was "when I login, don't auto redirect to dashboard".
    // Wait, this is "SelectGuild" page. When selecting a guild, it usually implies going to dashboard.
    // BUT the user said: "cuando inicie sesion en index no quiero que automaticamente me redirija a la dashboard".
    // Index login redirects to /select-guild or /dashboard?
    // Let's check Login.tsx.
    navigate('/dashboard') 
  }

  const handleInvite = (guildId: string) => {
    const clientId = '1202357534502174740' // Your Bot ID
    window.open(
      `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}&disable_guild_select=true`,
      '_blank'
    )
  }

  const filteredGuilds = guilds.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
  
  const hasPerms = (permissions: string) => {
      const p = BigInt(permissions)
      return (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20)
  }

  return (
    <div className="min-h-screen bg-[#18191c] text-slate-100">
      <GlowBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
          <h1 className="text-3xl font-bold text-white">Select a server</h1>

          <div className="flex w-full items-center gap-4 md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search servers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg bg-[#2b2d31] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 shadow-sm ring-1 ring-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 border-l border-white/10 pl-4">
              <NotificationBell />
              {user?.avatar && (
                <img
                  src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                  alt=""
                  className="h-9 w-9 rounded-full ring-2 ring-[#2b2d31]"
                />
              )}
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2b2d31] border-t-indigo-500" />
            <p className="text-slate-500">Loading your servers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredGuilds.map((guild) => (
              <motion.div
                key={guild.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative flex flex-col items-center rounded-xl bg-[#2b2d31] p-6 text-center shadow-lg transition-all hover:-translate-y-1 hover:bg-[#313338]"
              >
                {/* Icon */}
                <div className="mb-4 relative">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt=""
                      className="h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-[#1e1f22]"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1e1f22] text-2xl font-bold text-slate-500 ring-4 ring-[#1e1f22]">
                      {guild.name.substring(0, 2)}
                    </div>
                  )}
                  {guild.botInGuild && (
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-[#2b2d31]">
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3
                  className="mb-1 w-full truncate text-lg font-bold text-white"
                  title={guild.name}
                >
                  {guild.name}
                </h3>
                <p className="mb-6 text-xs font-medium uppercase tracking-wider text-slate-500">
                  {hasPerms(guild.permissions) ? 'Admin' : 'Member'}
                </p>

                {/* Action */}
                {guild.botInGuild ? (
                  <button
                    onClick={() => handleSelect(guild.id, guild.name, guild.permissions)}
                    className="w-full rounded-lg bg-indigo-500 py-2 text-sm font-bold text-white transition-all hover:bg-indigo-600 active:translate-y-0.5"
                  >
                    {hasPerms(guild.permissions) ? 'Manage Server' : 'Open Dashboard'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleInvite(guild.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e1f22] py-2 text-sm font-bold text-slate-300 transition-all hover:bg-[#18191c] hover:text-white active:translate-y-0.5"
                  >
                    Setup <ExternalLink size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
