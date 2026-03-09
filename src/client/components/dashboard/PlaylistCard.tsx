import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Settings, ChevronDown, ChevronUp, Music2, ListMusic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { usePlayerStore } from '@/stores/player'
import { useConfigStore } from '@/stores/config'
import { Playlist } from '@/components/library/PlaylistsSection'
import { useToastStore } from '@/stores/toast'

export default function PlaylistCard() {
  const navigate = useNavigate()
  const { userId, config } = useConfigStore() // Actually userId is in player store mostly, but let's check Library.tsx again. 
  // Library.tsx uses: const { guildId, userId, setContext, control } = usePlayerStore()
  // And const { config } = useConfigStore()
  
  const { userId: playerUserId, control } = usePlayerStore()
  const { config: appConfig } = useConfigStore()
  const { addToast } = useToastStore()
  
  const requesterId = playerUserId || appConfig.defaultUserId

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!requesterId) return

    const fetchPlaylists = async () => {
      setLoading(true)
      try {
        const r = await apiFetch<{ success: boolean; playlists: Playlist[] }>(
          `/v1/playlists/user/${encodeURIComponent(requesterId)}`,
          { method: 'GET' }
        )
        if (r.ok) {
          setPlaylists(r.data.playlists)
        }
      } catch (e) {
        console.error('Failed to fetch playlists', e)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [requesterId])

  const handlePlayPlaylist = async (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation()
    if (!playlist.tracks.length) return

    const payload = {
      add: playlist.tracks.map((t) => t.uri),
      requester: requesterId
    }

    const success = await control(payload)
    if (success) {
      addToast(`Playlist "${playlist.name}" añadida a la cola`, 'success')
    } else {
      // If control fails, try to create player first
      const created = await usePlayerStore.getState().createPlayer()
      if (created) {
         const retrySuccess = await control(payload)
         if (retrySuccess) {
            addToast(`Playlist "${playlist.name}" añadida a la cola`, 'success')
         } else {
            addToast('Error al reproducir playlist', 'error')
         }
      } else {
         addToast('No se pudo conectar al canal de voz', 'error')
      }
    }
  }

  const handlePlayTrack = async (uri: string) => {
    let success = await control({ add: [uri], requester: requesterId })
    
    if (!success) {
        const created = await usePlayerStore.getState().createPlayer()
        if (created) {
            success = await control({ add: [uri], requester: requesterId })
        }
    }

    if (success) {
      addToast('Canción añadida a la cola', 'success')
    } else {
      addToast('Error al reproducir canción', 'error')
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">My Playlists</h2>
        </div>
        <button 
            onClick={() => navigate('/library')}
            className="rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            title="Manage Playlists"
        >
            <ListMusic size={16} />
        </button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-6">
        {loading && playlists.length === 0 ? (
           <div className="py-10 text-center text-sm text-gray-500">Cargando playlists...</div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Music2 className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tienes playlists creadas</p>
            <button 
                onClick={() => navigate('/library')}
                className="mt-4 text-xs font-medium text-primary-500 hover:text-primary-600 hover:underline"
            >
                Crear una en la librería
            </button>
          </div>
        ) : (
          playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="overflow-hidden rounded-xl border border-transparent bg-gray-50 transition-all hover:border-gray-200 hover:shadow-sm dark:bg-gray-800/50 dark:hover:border-gray-700"
            >
              {/* Header Row */}
              <div 
                className="flex cursor-pointer items-center justify-between p-3"
                onClick={() => toggleExpand(playlist.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {playlist.image ? (
                    <img 
                      src={playlist.image} 
                      alt={playlist.name} 
                      className="h-10 w-10 rounded-lg object-cover shadow-sm shrink-0" 
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      <Music2 size={18} />
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {playlist.name}
                    </h3>
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      {playlist.tracks.length} tracks
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handlePlayPlaylist(e, playlist)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 text-gray-700 transition-colors hover:bg-primary-500 hover:text-white dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-500"
                    title="Reproducir Playlist"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                        e.stopPropagation()
                        // Navigate to Library with state to open the editor automatically
                        navigate('/library', { state: { editPlaylistId: playlist.id } })
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    title="Configuración"
                  >
                    <Settings size={12} />
                  </button>

                  <div className={`flex h-7 w-7 items-center justify-center transition-transform duration-200 ${expandedId === playlist.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedId === playlist.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 bg-white/50 dark:border-gray-800 dark:bg-black/20"
                  >
                    <div className="max-h-[200px] overflow-y-auto p-2">
                      {playlist.tracks.length === 0 ? (
                        <p className="py-2 text-center text-xs text-gray-400">Playlist vacía</p>
                      ) : (
                        <div className="space-y-1">
                            {playlist.tracks.map((track, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="w-4 text-center text-xs text-gray-400">{idx + 1}</span>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{track.title}</p>
                                            <p className="truncate text-[10px] text-gray-500">{track.author}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlePlayTrack(track.uri)}
                                        className="p-1 text-gray-400 hover:text-primary-500"
                                        title="Reproducir canción"
                                    >
                                        <Play size={12} fill="currentColor" />
                                    </button>
                                </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
