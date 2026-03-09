import { useEffect, useState } from 'react'
import { Save, Settings as SettingsIcon, User, Globe, ChevronDown, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import { useTranslation } from 'react-i18next'

const FLAGS: Record<string, string> = {
  en: 'https://flagcdn.com/w40/us.png',
  es: 'https://flagcdn.com/w40/es.png',
  hi: 'https://flagcdn.com/w40/in.png',
  ko: 'https://flagcdn.com/w40/kr.png',
  pt: 'https://flagcdn.com/w40/pt.png',
  ru: 'https://flagcdn.com/w40/ru.png',
  th: 'https://flagcdn.com/w40/th.png',
  vi: 'https://flagcdn.com/w40/vn.png',
}

const DASHBOARD_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
]

const BOT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
]

function LanguageSelect({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: { code: string, name: string }[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find(o => o.code === value)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-primary-500 hover:ring-2 hover:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <span className="flex items-center gap-3">
          {FLAGS[value] ? (
            <img src={FLAGS[value]} alt={value} className="h-5 w-8 rounded-sm object-cover" />
          ) : (
            <span className="text-2xl">🌐</span>
          )}
          <span>{selected?.name || value}</span>
        </span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="max-h-60 overflow-y-auto p-1">
                {options.map((opt) => (
                <button
                    key={opt.code}
                    onClick={() => {
                    onChange(opt.code)
                    setIsOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    value === opt.code ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-700 dark:text-gray-200'
                    }`}
                >
                    {FLAGS[opt.code] ? (
                        <img src={FLAGS[opt.code]} alt={opt.code} className="h-5 w-8 rounded-sm object-cover" />
                    ) : (
                        <span className="text-2xl">🌐</span>
                    )}
                    <span className="font-medium">{opt.name}</span>
                    {value === opt.code && <Check size={16} className="ml-auto" />}
                </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Settings() {
  const { guildId } = usePlayerStore()
  const { user, fetchUser } = useAuthStore()
  const { config } = useConfigStore()
  const { t, i18n } = useTranslation()

  const [activeTab, setActiveTab] = useState<'user' | 'guild'>('user')
  const [canManageGuild, setCanManageGuild] = useState(false)

  // Guild Settings
  const [prefix, setPrefix] = useState('')
  const [guildLanguage, setGuildLanguage] = useState('')
  
  // User Settings
  const [dashboardLanguage, setDashboardLanguage] = useState('en')

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    // Check Guild Permissions
    const storedPerms = localStorage.getItem('guild_permissions')
    let hasPerms = false

    if (storedPerms) {
        try {
            const p = BigInt(storedPerms)
            hasPerms = (p & BigInt(0x8)) === BigInt(0x8) || (p & BigInt(0x20)) === BigInt(0x20)
        } catch (e) {
            hasPerms = false
        }
    }

    // Override for Bot Owner/Admins
    if (user && config.botOwnerId) {
        if (user.id === config.botOwnerId || (config.botAdmins || []).includes(user.id)) {
            hasPerms = true
        }
    }

    setCanManageGuild(hasPerms && !!guildId)

    // Set initial user settings
    if (user?.dashboardLanguage) {
        setDashboardLanguage(user.dashboardLanguage)
    }
  }, [user, config, guildId])

  useEffect(() => {
    if (!guildId || !canManageGuild) return
    
    const loadGuildSettings = async () => {
      const r = await apiFetch<{ prefix: string; language: string }>(`/v1/settings/${guildId}`, {
        method: 'GET',
      })
      if (r.ok) {
        setPrefix(r.data.prefix)
        setGuildLanguage(r.data.language)
      }
    }
    loadGuildSettings()
  }, [guildId, canManageGuild])

  const handleSave = async () => {
    setBusy(true)
    setMsg(null)

    try {
        if (activeTab === 'user') {
            const r = await apiFetch('/v1/user/settings', {
                method: 'POST',
                body: JSON.stringify({ dashboardLanguage })
            })
            
            if (r.ok) {
                setMsg({ ok: true, text: t('settings.successUser') })
                await fetchUser() // Refresh user data to update global state
                i18n.changeLanguage(dashboardLanguage) // Force immediate update
            } else {
                setMsg({ ok: false, text: r.error || t('settings.error') })
            }
        } else if (activeTab === 'guild' && guildId) {
            const r = await apiFetch(`/v1/settings/${guildId}`, {
                method: 'POST',
                body: JSON.stringify({ prefix, language: guildLanguage }),
            })
            
            if (r.ok) {
                setMsg({ ok: true, text: t('settings.successGuild') })
            } else {
                setMsg({ ok: false, text: r.error || t('settings.error') })
            }
        }
    } catch (err) {
        setMsg({ ok: false, text: 'Error de conexión.' })
    } finally {
        setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('settings.subtitle')}
            </p>
        </div>

        <div className="flex gap-2 bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <button
                onClick={() => { setActiveTab('user'); setMsg(null); }}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                    activeTab === 'user'
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
            >
                <User size={16} />
                {t('settings.userTab')}
            </button>
            {canManageGuild && (
                <button
                    onClick={() => { setActiveTab('guild'); setMsg(null); }}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                        activeTab === 'guild'
                            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    <SettingsIcon size={16} />
                    {t('settings.guildTab')}
                </button>
            )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 p-6 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            {activeTab === 'user' ? <User className="h-4 w-4" /> : <SettingsIcon className="h-4 w-4" />}
            {activeTab === 'user' ? t('settings.userPrefs') : t('settings.guildConfig')}
          </div>
        </div>

        <div className="p-6 space-y-8">
            {activeTab === 'user' && (
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                            {t('settings.dashboardLang')}
                        </label>
                        <LanguageSelect 
                            value={dashboardLanguage} 
                            onChange={setDashboardLanguage} 
                            options={DASHBOARD_LANGUAGES} 
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {t('settings.dashboardLangDesc')}
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'guild' && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                        {t('settings.prefix')}
                    </label>
                    <input
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder="Ej: !"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-primary-500"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.prefixDesc')}
                    </p>
                    </div>

                    <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                        {t('settings.botLang')}
                    </label>
                    <LanguageSelect 
                        value={guildLanguage} 
                        onChange={setGuildLanguage} 
                        options={BOT_LANGUAGES} 
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.botLangDesc')}
                    </p>
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 p-6 dark:border-gray-800">
          {msg ? (
            <div
              className={`text-sm font-medium ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {msg.text}
            </div>
          ) : (
            <div />
          )}

          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {busy ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
