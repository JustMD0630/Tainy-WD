import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useConfigStore } from '@/stores/config'
import { usePlayerStore } from '@/stores/player'
import { useToastStore } from '@/stores/toast'
import SearchSection, { type SearchTrack } from '@/components/library/SearchSection'
import PlaylistsSection, { type Playlist } from '@/components/library/PlaylistsSection'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

export default function Library() {
  const { addToast } = useToastStore()
  const { config } = useConfigStore()
  const { guildId, userId, setContext, control } = usePlayerStore()
  const { t } = useTranslation()
  const location = useLocation()
  
  const requesterId = userId || config.defaultUserId

  const [q, setQ] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [results, setResults] = useState<SearchTrack[]>([])

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const selected = useMemo(
    () => playlists.find((p) => p.id === selectedId) || null,
    [playlists, selectedId]
  )
  const [newName, setNewName] = useState('')
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)

  // State to handle auto-opening editor from navigation state
  const [autoOpenEditorId, setAutoOpenEditorId] = useState<string | null>(null)

  useEffect(() => {
    if (location.state && (location.state as any).editPlaylistId) {
        setAutoOpenEditorId((location.state as any).editPlaylistId)
    }
  }, [location.state])

  useEffect(() => {
    if (!guildId && config.defaultGuildId) setContext(config.defaultGuildId, config.defaultUserId)
  }, [guildId, config.defaultGuildId, config.defaultUserId, setContext])

  useEffect(() => {
    // Only run if requesterId is present
    if (!requesterId) return

    const run = async () => {
      const r = await apiFetch<{ success: boolean; playlists: Playlist[] }>(`/v1/playlists/user/${encodeURIComponent(requesterId)}`, {
        method: 'GET',
      })
      if (!r.ok) return
      setPlaylists(r.data.playlists)
      
      // If no playlist selected yet, and we have playlists, select first one
      // We check !selectedId to avoid overriding user selection on re-renders
      if (!selectedId && r.data.playlists.length > 0) {
          setSelectedId(r.data.playlists[0].id)
      }
    }
    run()
  }, [requesterId]) // Depend only on requesterId to fetch when user context is ready

  useEffect(() => {
    if (!location.state) return
    const editId = (location.state as any).editPlaylistId
    if (editId) {
        // If playlists already loaded, select it
        if (playlists.length > 0) {
            setSelectedId(editId)
            // Clear location state to prevent loop
            window.history.replaceState({}, document.title)
        }
    }
  }, [location.state, playlists])

  useEffect(() => {
    if (!selected) return
    setEditingName(selected.name)
  }, [selected?.id])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('library.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('library.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:h-[calc(100vh-12rem)] h-[60vh]">
          <SearchSection
            guildId={guildId}
            query={q}
            setQuery={setQ}
            busy={searchBusy}
            results={results}
            playlistEnabled={!!selected}
            searchEnabled={requesterId.trim().length >= 3}
            onSearch={async () => {
              setSearchBusy(true)
              const r = await apiFetch<{ tracks: SearchTrack[] }>(
                `/v1/search?identifier=${encodeURIComponent(q)}&requester=${encodeURIComponent(requesterId)}`,
                { method: 'GET' }
              )
              setSearchBusy(false)
              if (!r.ok) return
              setResults(r.data.tracks || [])
            }}
            onAddToQueue={async (uri, encoded) => {
              // Si tenemos encoded track, lo enviamos con un prefijo especial para que el backend lo reconozca
              // O simplemente enviamos el string base64 si el backend está preparado
              // En este caso, usaremos el prefijo "encoded:" que implementaremos en el backend
              const itemToAdd = encoded ? `encoded:${encoded}` : uri
              await control({ add: [itemToAdd] })
            }}
            onAddToPlaylist={async (track) => {
              if (!selected) return
              const nextTracks = [...selected.tracks, track]
              setSaving(true)
              const r = await apiFetch<{ success: boolean; playlist: Playlist }>(
                `/v1/playlists/${selected.id}`,
                {
                  method: 'PUT',
                  body: JSON.stringify({ tracks: nextTracks }),
                }
              )
              setSaving(false)
              if (!r.ok) {
                  addToast('Error al añadir canción', 'error')
                  return
                }
                setPlaylists((ps) =>
                  ps.map((p) => (p.id === r.data.playlist.id ? r.data.playlist : p))
                )
                addToast('Canción añadida a la playlist', 'success')
              }}
            />
          </div>
  
          <div className="lg:col-span-5 lg:h-[calc(100vh-12rem)] h-[60vh]">
            <PlaylistsSection
              guildId={guildId}
              playlists={playlists}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              selected={selected}
              newName={newName}
              setNewName={setNewName}
              editingName={editingName}
              setEditingName={setEditingName}
              saving={saving}
              forceEditMode={(location.state as any)?.editPlaylistId === selectedId} // Pass prop
              onCreate={async (name) => {
                if (!name) return
                const r = await apiFetch<{ success: boolean; playlist: Playlist }>('/v1/playlists', {
                  method: 'POST',
                  body: JSON.stringify({ name, owner: requesterId }),
                })
                if (!r.ok) {
                    addToast('Error al crear la playlist', 'error')
                    return
                }
                setPlaylists((ps) => [r.data.playlist, ...ps])
                setSelectedId(r.data.playlist.id)
                setNewName('')
                addToast('Playlist creada correctamente', 'success')
              }}
            onSaveName={async (name, isPrivate, description, commentsDisabled, image) => {
              if (!selected) return
              setSaving(true)
              const r = await apiFetch<{ success: boolean; playlist: Playlist }>(
                `/v1/playlists/${selected.id}`,
                {
                  method: 'PUT',
                  body: JSON.stringify({ name, private: isPrivate, description, commentsDisabled, image }),
                }
              )
              setSaving(false)
              if (!r.ok) {
                  addToast('Error al actualizar la playlist', 'error')
                  return
              }
              
              setPlaylists((ps) =>
                ps.map((p) => (p.id === selected.id ? { ...p, name, private: isPrivate, description, commentsDisabled, image } : p))
              )
              addToast('Playlist actualizada correctamente', 'success')
            }}
            onReorderTracks={async (tracks) => {
              if (!selected) return
              setSaving(true)
              const r = await apiFetch<{ success: boolean; playlist: Playlist }>(
                `/v1/playlists/${selected.id}`,
                {
                  method: 'PUT',
                  body: JSON.stringify({ tracks }),
                }
              )
              setSaving(false)
              if (!r.ok) {
                  addToast('Error al reordenar canciones', 'error')
                  return
              }
              setPlaylists((ps) =>
                ps.map((p) => (p.id === r.data.playlist.id ? r.data.playlist : p))
              )
            }}
            onDelete={async () => {
              if (!selected) return
              const r = await apiFetch(`/v1/playlists/${selected.id}`, { method: 'DELETE' })
              if (!r.ok) {
                  addToast('Error al eliminar playlist', 'error')
                  return
              }
              setPlaylists((ps) => ps.filter((p) => p.id !== selected.id))
              setSelectedId('')
              addToast('Playlist eliminada', 'success')
            }}
            onRemoveTrack={async (idx) => {
              if (!selected) return
              const nextTracks = selected.tracks.filter((_, i) => i !== idx)
              setSaving(true)
              const r = await apiFetch<{ success: boolean; playlist: Playlist }>(
                `/v1/playlists/${selected.id}`,
                {
                  method: 'PUT',
                  body: JSON.stringify({ tracks: nextTracks }),
                }
              )
              setSaving(false)
              if (!r.ok) {
                  addToast('Error al eliminar canción', 'error')
                  return
              }
              setPlaylists((ps) =>
                ps.map((p) => (p.id === r.data.playlist.id ? r.data.playlist : p))
              )
              addToast('Canción eliminada de la playlist', 'success')
            }}
            onSendToQueue={async () => {
              if (!selected) return
              
              const payload = { 
                add: selected.tracks.map((t) => t.uri),
                requester: selected.owner
              }
              
              let success = await control(payload)
              
              if (!success) {
                  const created = await usePlayerStore.getState().createPlayer()
                  if (created) {
                      success = await control(payload)
                  }
              }
              
              if (success) {
                  addToast('Playlist añadida a la cola', 'success')
              } else {
                  addToast('No se pudo conectar al canal de voz', 'error')
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
