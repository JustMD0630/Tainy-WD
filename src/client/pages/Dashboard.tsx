import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore } from '@/stores/config'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import NowPlayingCard from '@/components/dashboard/NowPlayingCard'
import QueueCard from '@/components/dashboard/QueueCard'
import PlaylistCard from '@/components/dashboard/PlaylistCard'
import ControlsPanel from '@/components/dashboard/ControlsPanel'
import SearchModal from '@/components/dashboard/SearchModal'
import { useTranslation } from 'react-i18next'

import AddToPlaylistModal from '@/components/dashboard/AddToPlaylistModal'
import type { Track } from '@/stores/player'

export default function Dashboard() {
  const navigate = useNavigate()
  const { config } = useConfigStore()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const {
    guildId,
    userId,
    setContext,
    refresh,
    connectWs,
    disconnectWs,
    wsStatus,
    status,
    data,
    error,
    control,
    createPlayer,
    destroyPlayer,
  } = usePlayerStore()

  const [searchOpen, setSearchOpen] = useState(false)
  const [volume, setVolume] = useState<number>(100)
  const [seek, setSeek] = useState<number>(0)
  const [seekDirty, setSeekDirty] = useState(false)
  
  // Playlist Modal State
  const [playlistModalTrack, setPlaylistModalTrack] = useState<Track | null>(null)
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false)
  
  const handleOpenPlaylistModal = (track: Track) => {
      setPlaylistModalTrack(track)
      setIsPlaylistModalOpen(true)
  }

  // Initialize context from Auth Store and LocalStorage
  useEffect(() => {
    const selectedGuild = localStorage.getItem('selected_guild')
    const currentUserId = user?.id || config.defaultUserId

    // Redirect if no guild selected
    if (!selectedGuild) {
      navigate('/select-guild')
      return
    }

    if (selectedGuild && currentUserId) {
      setContext(selectedGuild, currentUserId)
    }
  }, [user, config.defaultGuildId, config.defaultUserId, setContext, navigate])

  useEffect(() => {
    refresh()
  }, [guildId, userId, refresh])

  useEffect(() => {
    if (!guildId) return
    const interval = window.setInterval(
      () => {
        refresh(true)
      },
      // Reduce polling frequency when WS is connected to avoid spam
      wsStatus === 'connected' ? 10000 : 2000
    )
    return () => window.clearInterval(interval)
  }, [guildId, wsStatus, refresh])

  // Removed local connectWs/disconnectWs since it's now handled globally in AppShell

  useEffect(() => {
    if (!data) return
    setVolume((_) => data.volume ?? 100)
  }, [data])

  const now = data?.current
  const queue = data?.queue ?? []
  const progress = useMemo(() => {
    if (!now) return 0
    const p = seekDirty ? seek : (data?.position ?? 0)
    const denom = now.length || 1
    return Math.max(0, Math.min(1, p / denom))
  }, [now, data?.position, seek, seekDirty])
  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  return (
    <div className="mx-auto max-w-7xl">
      {/* Topbar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status - Only shows Connected/Disconnected based on WS/Player status */}
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              status === 'ready' && data?.voiceChannel 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                : 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${status === 'ready' && data?.voiceChannel ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {status === 'ready' && data?.voiceChannel ? t('dashboard.connected') : t('dashboard.disconnected')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Player & Controls */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <NowPlayingCard
            current={now}
            position={seekDirty ? seek : (data?.position ?? 0)}
            progress={progress}
            onRefresh={() => refresh()}
            onOpenSearch={() => setSearchOpen(true)}
            onAddToPlaylist={handleOpenPlaylistModal}
          />

          <ControlsPanel
            loop={String(data?.loop ?? 'none')}
            paused={data?.paused ?? false}
            current={now}
            position={data?.position ?? 0}
            volume={volume}
            setVolume={setVolume}
            seekValue={seek}
            setSeekValue={setSeek}
            seekDirty={seekDirty}
            setSeekDirty={setSeekDirty}
            onCreatePlayer={() => void createPlayer()}
            onDestroyPlayer={() => void destroyPlayer()}
            onControl={async (payload) => {
              await control(payload)
            }}
            voiceChannel={(data as any)?.voiceChannel}
            voiceChannelName={(data as any)?.voiceChannelName}
          />

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400">
              {error}
            </div>
          ) : null}

          {status === 'loading' && !now ? (
            <div className="animate-pulse rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {t('dashboard.loading')}
            </div>
          ) : null}
        </div>

        {/* Right Column: Queue & Playlists */}
        <div className="flex flex-col gap-6 lg:col-span-4 lg:h-[calc(100vh-8rem)]">
          <div className="flex-1 min-h-0">
            <QueueCard
              queue={queue}
              onRemove={async (index) => {
                // index 0 in QueueCard is the first upcoming track, which is index 1 for the backend
                // Visual Index (1..N) = QueueCard Index (0..N-1) + 1
                await control({ remove: index + 1 })
                await refresh(true)
              }}
              onReorder={async (from, to) => {
                await control({ move: { from, to } })
                await refresh(true)
              }}
              onAddToPlaylist={handleOpenPlaylistModal}
            />
          </div>
          <div className="flex-1 min-h-0">
            <PlaylistCard />
          </div>
        </div>
      </div>
      
      <AddToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        track={playlistModalTrack}
      />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        requesterId={userId || config.defaultUserId}
        onAdd={async (uri) => {
          const current = usePlayerStore.getState().data

          // 1. Ensure player exists before anything
          if (!current) {
            await createPlayer()
            await refresh()
            // Verify creation
            const check = usePlayerStore.getState().data
            if (!check) return false // Failed to create
          }

          let retried = false
          // Pass requesterId from store (userId)
          const payload = { add: [uri], requester: userId || config.defaultUserId }

          for (let i = 0; i < 3; i++) {
            retried = await control(payload)
            if (retried) break
            // Retry logic
            await sleep(450)
            await refresh()
          }
          await refresh()
          return retried
        }}
      />
    </div>
  )
}
