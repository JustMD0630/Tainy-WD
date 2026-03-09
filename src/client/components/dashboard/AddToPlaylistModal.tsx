import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Music2, Plus, ListMusic } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { Playlist } from '@/components/library/PlaylistsSection'
import type { Track } from '@/stores/player'

interface AddToPlaylistModalProps {
    isOpen: boolean
    onClose: () => void
    track: Track | null
}

export default function AddToPlaylistModal({ isOpen, onClose, track }: AddToPlaylistModalProps) {
    const { user } = useAuthStore()
    const { addToast } = useToastStore()
    const [playlists, setPlaylists] = useState<Playlist[]>([])
    const [loading, setLoading] = useState(false)
    const [addingTo, setAddingTo] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && user) {
            fetchPlaylists()
        }
    }, [isOpen, user])

    const fetchPlaylists = async () => {
        setLoading(true)
        const r = await apiFetch<{ playlists: Playlist[] }>(`/v1/playlists/user/${user?.id}`)
        if (r.ok) {
            setPlaylists(r.data.playlists)
        }
        setLoading(false)
    }

    const handleAddToPlaylist = async (playlist: Playlist) => {
        if (!track) return
        setAddingTo(playlist.id)

        // 1. Fetch current details to get tracks array
        // NOTE: The GET /v1/playlists/:id endpoint returns the playlist object DIRECTLY, not wrapped in { playlist: ... }
        // BUT apiFetch<Playlist> implies data IS the playlist.
        // Let's verify what apiFetch returns. It returns { ok, status, data: T }.
        // If GET /v1/playlists/:id returns JSON object { id: ..., tracks: ... }, then T = Playlist.
        // So detailRes.data IS the playlist.
        
        const detailRes = await apiFetch<Playlist>(`/v1/playlists/${playlist.id}`)
        
        // Debug log
        console.log('[AddToPlaylist] Fetch detail:', detailRes)

        if (!detailRes.ok || !detailRes.data) {
            console.error('[AddToPlaylist] Failed to fetch playlist details', detailRes)
            addToast('Error fetching playlist details', 'error')
            setAddingTo(null)
            return
        }
        
        // Check if 'tracks' exists on data directly or data.playlist (in case of inconsistency)
        // Casting to any to safely check properties
        const rawData = detailRes.data as any
        const currentTracks = Array.isArray(rawData.tracks) 
            ? rawData.tracks 
            : (rawData.playlist && Array.isArray(rawData.playlist.tracks) ? rawData.playlist.tracks : [])
        
        // 2. Prepare new track object
        const newTrack = {
            title: track.title,
            uri: track.uri,
            length: track.length,
            thumbnail: track.thumbnail,
            author: track.author,
            requester: track.requester
        }
        
        // 3. Append and update
        const nextTracks = [...currentTracks, newTrack]
        
        console.log('[AddToPlaylist] Updating with tracks:', nextTracks)

        // Fix: Use correct JSON body structure that matches backend expectation
        // IMPORTANT: Ensure the endpoint is correct. /v1/playlists/:id is PUT
        // Double check backend route registration in playlist.ts
        const updateRes = await apiFetch<{ success: boolean; playlist: Playlist }>(`/v1/playlists/${playlist.id}`, {
            method: 'PUT',
            body: JSON.stringify({ tracks: nextTracks })
        })

        console.log('[AddToPlaylist] Update response:', updateRes)

        if (updateRes.ok) {
            addToast(`Añadida a ${playlist.name}`, 'success')
            onClose()
        } else {
            console.error('[AddToPlaylist] Update failed', updateRes)
            addToast('Error al añadir canción', 'error')
        }
        setAddingTo(null)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                    <ListMusic className="text-primary-500" />
                                    Añadir a Playlist
                                </h3>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto flex-1 space-y-2">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                                    </div>
                                ) : playlists.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <Music2 className="mx-auto h-12 w-12 opacity-20 mb-2" />
                                        <p>No tienes playlists creadas.</p>
                                    </div>
                                ) : (
                                    playlists.map(playlist => (
                                        <button
                                            key={playlist.id}
                                            onClick={() => handleAddToPlaylist(playlist)}
                                            disabled={addingTo === playlist.id}
                                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group text-left"
                                        >
                                            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                                                {playlist.tracks.length > 0 ? (
                                                    <img src={playlist.tracks[0].thumbnail || ''} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                        <Music2 size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white truncate">{playlist.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{playlist.tracks.length} canciones</p>
                                            </div>
                                            {addingTo === playlist.id ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Plus size={16} />
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
