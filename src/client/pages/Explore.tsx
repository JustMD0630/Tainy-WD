
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '@/lib/api'
import { usePlayerStore } from '@/stores/player'
import { useToastStore } from '@/stores/toast'
import { useConfigStore } from '@/stores/config'
import { useAuthStore } from '@/stores/auth'
import { useTranslation } from 'react-i18next'
import { useSearchParams, Link } from 'react-router-dom'
import { Play, Music2, Search, User, ListMusic, Send, Trash2, Flag, AlertTriangle } from 'lucide-react'
import type { Playlist } from '@/components/library/PlaylistsSection'
import { UserBadge } from '@/components/common/UserBadge'

type ExplorePlaylist = Playlist & {
    ownerInfo?: {
        username: string
        avatar: string | null
        isOwner?: boolean
        isAdmin?: boolean
        isPremium?: boolean
    }
}

type Comment = {
    id: string
    playlistId: string
    userId: string
    content: string
    created: number
    hidden?: boolean
    userInfo: {
        username: string
        avatar: string | null
        isOwner?: boolean
        isAdmin?: boolean
        isPremium?: boolean
    }
}

export default function Explore() {
  const { addToast } = useToastStore()
  const { control, createPlayer, data: playerData } = usePlayerStore()
  const { config } = useConfigStore()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  
  const [playlists, setPlaylists] = useState<ExplorePlaylist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState<ExplorePlaylist | null>(null)
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [reportingComment, setReportingComment] = useState<string | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)

  useEffect(() => {
    fetchExplore()
  }, [])

  const [searchParams] = useSearchParams()
  const playlistIdFromUrl = searchParams.get('playlistId')

  useEffect(() => {
    if (playlistIdFromUrl && playlists.length > 0) {
        const found = playlists.find(p => p.id === playlistIdFromUrl)
        if (found) {
            setSelectedPlaylist(found)
            window.history.replaceState({}, '', '/explore')
        }
    }
  }, [playlists, playlistIdFromUrl])

  useEffect(() => {
      if (selectedPlaylist) {
          fetchComments(selectedPlaylist.id)
      } else {
          setComments([])
      }
  }, [selectedPlaylist])

  const fetchExplore = async () => {
    setLoading(true)
    const r = await apiFetch<{ playlists: ExplorePlaylist[] }>('/v1/playlists/explore', {
        method: 'GET'
    })
    setLoading(false)
    if (r.ok) {
        setPlaylists(r.data.playlists)
    }
  }

  const fetchComments = async (playlistId: string) => {
      setLoadingComments(true)
      const r = await apiFetch<{ comments: Comment[] }>(`/v1/playlists/${playlistId}/comments`, {
          method: 'GET'
      })
      setLoadingComments(false)
      if (r.ok) {
          setComments(r.data.comments)
      }
  }

  const handlePostComment = async () => {
      if (!selectedPlaylist || !user || !newComment.trim()) return

      const r = await apiFetch(`/v1/playlists/${selectedPlaylist.id}/comments`, {
          method: 'POST',
          body: JSON.stringify({
              content: newComment,
              userId: user.id
          })
      })

      if (r.ok) {
          setNewComment('')
          fetchComments(selectedPlaylist.id)
          addToast(t('explore.toasts.commentPosted'), 'success')
      } else {
          addToast(r.error || t('explore.toasts.commentError'), 'error')
      }
  }

  const handleDeleteComment = (commentId: string) => {
      setDeletingCommentId(commentId)
  }

  const submitDeleteComment = async () => {
      if (!user || !deletingCommentId) return
      
      const r = await apiFetch(`/v1/comments/${deletingCommentId}`, {
          method: 'DELETE',
          body: JSON.stringify({ userId: user.id })
      })

      if (r.ok) {
          setComments(comments.filter(c => c.id !== deletingCommentId))
          addToast(t('explore.toasts.commentDeleted'), 'success')
          setDeletingCommentId(null)
      } else {
          addToast(t('explore.toasts.deleteError'), 'error')
      }
  }

  const [customReason, setCustomReason] = useState('')
  const [showCustomReasonInput, setShowCustomReasonInput] = useState(false)

  const handleReportComment = async (commentId: string, reason: string) => {
      if (!user) return

      const r = await apiFetch(`/v1/comments/${commentId}/report`, {
          method: 'POST',
          body: JSON.stringify({
              reporterId: user.id,
              reason
          })
      })

      if (r.ok) {
          addToast(t('explore.toasts.reportSent'), 'success')
          setReportingComment(null)
          setCustomReason('')
          setShowCustomReasonInput(false)
          // Optimistically hide comment if needed (logic can be improved)
          fetchComments(selectedPlaylist?.id!) 
      } else {
          addToast(t('explore.toasts.reportError'), 'error')
      }
  }

  const handleReasonSelection = (reason: string) => {
    if (reason === 'Otro') {
      setShowCustomReasonInput(true)
    } else {
      if (reportingComment) {
        handleReportComment(reportingComment, reason)
      }
    }
  }

  const submitCustomReport = () => {
      if (reportingComment && customReason.trim()) {
          handleReportComment(reportingComment, customReason)
          setCustomReason('')
          setShowCustomReasonInput(false)
      }
  }



  const filteredPlaylists = playlists.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.ownerInfo?.username.toLowerCase().includes(search.toLowerCase())
  )

  const handlePlay = async (playlist: ExplorePlaylist) => {
      const payload = {
          add: playlist.tracks.map(t => t.uri),
          requester: playlist.owner // Credit the original creator
      }

      let success = await control(payload)
      
      if (!success) {
          const created = await createPlayer()
          if (created) {
              success = await control(payload)
          }
      }

      if (success) {
          addToast(t('explore.toasts.playing', { name: playlist.name }), 'success')
      } else {
          addToast(t('explore.toasts.playError'), 'error')
      }
  }

  const [revealedComments, setRevealedComments] = useState<string[]>([])

  const isHidden = (comment: Comment) => comment.hidden && !revealedComments.includes(comment.id)

  return (
    <div className="mx-auto max-w-7xl h-full flex flex-col">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('explore.title')} <span className="text-xs text-primary-500 bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded-full align-middle">v2.0</span></h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('explore.subtitle')}
          </p>
        </div>

        <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input 
                type="text"
                name="search"
                id="search"
                aria-label={t('explore.search')}
                placeholder={t('explore.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border-none bg-white py-3 pl-12 pr-6 shadow-sm ring-1 ring-gray-200 transition-all focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
            />
        </div>
      </div>

      {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
              ))}
          </div>
      ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-20">
              {filteredPlaylists.map((playlist) => (
                  <motion.div
                    key={playlist.id}
                    layoutId={playlist.id}
                    className="group relative overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-500/10"
                  >
                      {/* Cover Art Collage */}
                      <div 
                        className="relative h-64 w-full cursor-pointer bg-gray-100 dark:bg-gray-800 overflow-hidden"
                        onClick={() => setSelectedPlaylist(playlist)}
                      >
                          {playlist.tracks.length > 0 ? (
                              playlist.tracks.slice(0, 4).length >= 4 ? (
                                  <div className="grid h-full w-full grid-cols-2 gap-0.5">
                                      {playlist.tracks.slice(0, 4).map((t, i) => (
                                          <img key={i} src={t.thumbnail || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                      ))}
                                  </div>
                              ) : (
                                  <img src={playlist.tracks[0].thumbnail || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              )
                          ) : (
                              <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                                  <Music2 className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                              </div>
                          )}
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

                          {/* Play Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handlePlay(playlist)
                                }}
                                className="scale-0 transform rounded-full bg-primary-600 p-5 text-white shadow-lg transition-all duration-300 group-hover:scale-100 hover:bg-primary-500 hover:scale-110 active:scale-95 ring-4 ring-primary-500/30"
                              >
                                  <Play fill="currentColor" className="ml-1 w-8 h-8" />
                              </button>
                          </div>

                          {/* Content Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                                      <ListMusic size={12} />
                                      {playlist.tracks.length} {t('explore.tracks')}
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-3 overflow-hidden">
                                {playlist.image && (
                                    <img 
                                        src={playlist.image} 
                                        alt={playlist.name} 
                                        className="h-12 w-12 rounded-lg object-cover shadow-sm shrink-0 ring-2 ring-white/20" 
                                    />
                                )}
                                <h3 
                                    className="truncate text-xl font-black text-white cursor-pointer hover:text-primary-300 transition-colors drop-shadow-md"
                                    onClick={() => setSelectedPlaylist(playlist)}
                                >
                                    {playlist.name}
                                </h3>
                              </div>

                              <div className="mt-2 flex items-center gap-2 text-sm text-gray-200 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                                  {playlist.ownerInfo?.avatar ? (
                                      <img src={playlist.ownerInfo.avatar} className="h-6 w-6 rounded-full ring-2 ring-white/50" />
                                  ) : (
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                                        <User className="h-3 w-3" />
                                      </div>
                                  )}
                                  <Link 
                                    to={`/users/${playlist.owner}`} 
                                    onClick={(e) => e.stopPropagation()}
                                    className="truncate max-w-[150px] font-medium hover:underline hover:text-white"
                                  >
                                    {playlist.ownerInfo?.username || 'Desconocido'}
                                  </Link>
                                  {playlist.ownerInfo && (
                                    <UserBadge 
                                        isOwner={playlist.ownerInfo.isOwner}
                                        isAdmin={playlist.ownerInfo.isAdmin}
                                        isPremium={playlist.ownerInfo.isPremium}
                                        className="scale-75 origin-left"
                                    />
                                  )}
                              </div>
                          </div>
                      </div>
                  </motion.div>
              ))}
          </div>
      )}

      {/* Playlist Detail Modal */}
      <AnimatePresence>
          {selectedPlaylist && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedPlaylist(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900 flex flex-col my-4"
                  >
                      {/* Header */}
                      <div className="relative h-40 sm:h-48 bg-gradient-to-br from-primary-600 to-purple-700 p-4 sm:p-8 flex items-end shrink-0">
                          {selectedPlaylist.image && (
                              <div className="absolute inset-0 z-0">
                                  <img 
                                      src={selectedPlaylist.image} 
                                      className="h-full w-full object-cover opacity-30 blur-sm" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              </div>
                          )}
                          <div className="relative z-10 flex w-full items-end justify-between gap-4">
                              <div className="flex items-end gap-3 sm:gap-4 min-w-0">
                                  {selectedPlaylist.image && (
                                      <img 
                                          src={selectedPlaylist.image} 
                                          className="h-16 w-16 sm:h-24 sm:w-24 rounded-xl object-cover shadow-lg ring-2 sm:ring-4 ring-white/20 shrink-0" 
                                      />
                                  )}
                                  <div className="min-w-0">
                                      <h2 className="text-xl sm:text-3xl font-black text-white truncate leading-tight">{selectedPlaylist.name}</h2>
                                      <div className="flex flex-wrap items-center gap-2 text-white/80 mt-1 sm:mt-2 text-xs sm:text-sm">
                                          <Link to={`/users/${selectedPlaylist.owner}`} className="truncate max-w-[100px] sm:max-w-none hover:text-white hover:underline font-bold">
                                            {selectedPlaylist.ownerInfo?.username}
                                          </Link>
                                          {selectedPlaylist.ownerInfo && (
                                              <UserBadge 
                                                  isOwner={selectedPlaylist.ownerInfo.isOwner}
                                                  isAdmin={selectedPlaylist.ownerInfo.isAdmin}
                                                  isPremium={selectedPlaylist.ownerInfo.isPremium}
                                                  className="scale-75 origin-left"
                                              />
                                          )}
                                          <span className="hidden sm:inline">•</span>
                                          <span>{selectedPlaylist.tracks.length} {t('explore.tracks')}</span>
                                      </div>
                                  </div>
                              </div>
                              <button 
                                onClick={() => handlePlay(selectedPlaylist)}
                                className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-primary-600 shadow-lg transition-transform hover:scale-105"
                              >
                                  <Play fill="currentColor" size={14} className="sm:w-4 sm:h-4" />
                                  <span className="hidden sm:inline">{t('explore.playAll')}</span>
                                  <span className="sm:hidden">Play</span>
                              </button>
                          </div>
                          
                          {/* Close Button */}
                          <button 
                            onClick={() => setSelectedPlaylist(null)}
                            className="absolute top-4 right-4 rounded-full bg-black/20 p-2 text-white hover:bg-black/40"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                      </div>

                      {/* Tracks List */}
                      <div className="flex-1 overflow-y-auto p-6">
                          <div className="space-y-2">
                              {selectedPlaylist.tracks.map((track, i) => (
                                  <div key={i} className="flex items-center gap-4 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                      <span className="w-6 text-center text-sm font-bold text-gray-300">{i + 1}</span>
                                      <img src={track.thumbnail || ''} className="h-10 w-10 rounded-lg object-cover bg-gray-200" />
                                      <div className="flex-1 min-w-0">
                                          <div className="truncate font-bold text-gray-900 dark:text-white">{track.title}</div>
                                          <div className="truncate text-xs text-gray-500">{track.author}</div>
                                      </div>
                                      <div className="text-xs font-mono text-gray-400">
                                          {track.length ? new Date(track.length).toISOString().substr(14, 5) : '--:--'}
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          {/* Comments Section */}
                          <div className="mt-8 border-t border-gray-100 pt-8 dark:border-gray-800">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Comentarios ({comments.length})</h3>
                              
                              {/* Input */}
                              {user ? (
                                  <div className="mb-6 flex gap-4">
                                      {user.avatar ? (
                                        <img 
                                            src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} 
                                            className="h-10 w-10 rounded-full bg-gray-200" 
                                        />
                                      ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                                            <User size={20} />
                                        </div>
                                      )}
                                      <div className="relative flex-1">
                                          <input 
                                            type="text" 
                                            name="comment"
                                            id="comment"
                                            aria-label={t('explore.placeholderComment')}
                                            placeholder={t('explore.placeholderComment')} 
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-12 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                          />
                                          <button 
                                            onClick={handlePostComment}
                                            disabled={!newComment.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50 dark:hover:bg-primary-900/20"
                                          >
                                              <Send size={18} />
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="mb-6 rounded-xl bg-blue-50 p-4 text-center text-sm font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                      Inicia sesión para unirte a la conversación.
                                  </div>
                              )}

                              {/* List */}
                              {loadingComments ? (
                                  <div className="flex justify-center py-8">
                                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
                                  </div>
                              ) : (
                                  <div className="space-y-6">
                                      {comments.length > 0 ? (
                                          comments.map((comment) => (
                                              <div key={comment.id} className="group flex gap-4">
                                                  {comment.userInfo.avatar ? (
                                                      <img src={comment.userInfo.avatar} className="h-10 w-10 rounded-full bg-gray-200 object-cover" />
                                                  ) : (
                                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-gray-800">
                                                          <User size={16} />
                                                      </div>
                                                  )}
                                                  
                                                  <div className="flex-1 space-y-1">
                                                      <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-2">
                                                              <Link to={`/users/${comment.userId}`} className="font-bold text-gray-900 dark:text-white hover:underline">
                                                                  {comment.userInfo.username}
                                                              </Link>
                                                              <UserBadge 
                                                                isOwner={comment.userInfo.isOwner}
                                                                isAdmin={comment.userInfo.isAdmin}
                                                                isPremium={comment.userInfo.isPremium}
                                                                className="scale-75 origin-left"
                                                              />
                                                              <span className="text-xs text-gray-500">
                                                                  {new Date(comment.created).toLocaleDateString()}
                                                              </span>
                                                          </div>
                                                          
                                                          {/* Actions */}
                                                          {user && (
                                                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                                  <button 
                                                                    onClick={() => setReportingComment(comment.id)}
                                                                    className="rounded p-1 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
                                                                    title="Reportar"
                                                                  >
                                                                      <Flag size={14} />
                                                                  </button>
                                                                  {user.id === comment.userId && (
                                                                      <button 
                                                                        onClick={() => handleDeleteComment(comment.id)}
                                                                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                                                        title="Eliminar"
                                                                      >
                                                                          <Trash2 size={14} />
                                                                      </button>
                                                                  )}
                                                              </div>
                                                          )}
                                                      </div>
                                                      
                                                      {isHidden(comment) ? (
                                                          <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                                                              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                                                                  <AlertTriangle size={16} />
                                                                  <span>{t('explore.hiddenComment')}</span>
                                                                  <button 
                                                                    onClick={() => setRevealedComments([...revealedComments, comment.id])}
                                                                    className="text-primary-600 hover:underline dark:text-primary-400"
                                                                  >
                                                                      {t('explore.reveal')}
                                                                  </button>
                                                              </div>
                                                          </div>
                                                      ) : (
                                                          <p className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed">
                                                              {comment.content}
                                                          </p>
                                                      )}
                                                  </div>
                                              </div>
                                          ))
                                      ) : (
                                          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                                              <div className="mb-2 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                                                  <AlertTriangle size={20} />
                                              </div>
                                              <p>No hay comentarios aún.</p>
                                              <p className="text-xs">¡Sé el primero en opinar sobre esta playlist!</p>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
      {/* Report Modal */}
      <AnimatePresence>
          {reportingComment && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setReportingComment(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                  >
                      <div className="mb-4 flex items-center gap-3 text-red-500">
                          <Flag size={24} />
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('explore.report.title')}</h3>
                      </div>
                      
                      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                          {t('explore.report.subtitle')}
                      </p>

                    <div className="space-y-2">
                        {!showCustomReasonInput ? (
                          (['spam', 'offensive', 'harassment', 'fake', 'other'] as const).map((reasonKey) => (
                              <button
                                key={reasonKey}
                                onClick={() => handleReasonSelection(reasonKey)}
                                className="w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-left text-sm font-medium transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:hover:text-primary-400"
                              >
                                  {t(`explore.report.reasons.${reasonKey}`)}
                              </button>
                          ))
                        ) : (
                          <div className="space-y-3">
                              <textarea
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                name="customReason"
                                id="customReason"
                                aria-label={t('explore.report.describe')}
                                placeholder={t('explore.report.describe')}
                                rows={3}
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                              />
                              <div className="flex gap-2">
                                  <button
                                    onClick={() => setShowCustomReasonInput(false)}
                                    className="flex-1 rounded-xl bg-gray-100 p-3 text-sm font-bold text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                                  >
                                      {t('explore.report.back')}
                                  </button>
                                  <button
                                    onClick={submitCustomReport}
                                    disabled={!customReason.trim()}
                                    className="flex-1 rounded-xl bg-primary-600 p-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
                                  >
                                      {t('explore.report.send')}
                                  </button>
                              </div>
                          </div>
                        )}
                      </div>

                      {!showCustomReasonInput && (
                        <button 
                          onClick={() => {
                              setReportingComment(null)
                              setShowCustomReasonInput(false)
                              setCustomReason('')
                          }}
                          className="mt-6 w-full rounded-xl p-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            {t('explore.report.cancel')}
                        </button>
                      )}
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
          {deletingCommentId && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setDeletingCommentId(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
                  >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                          <Trash2 size={24} />
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {t('explore.toasts.deleteConfirm')}
                      </h3>
                      
                      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                          {t('explore.toasts.deleteConfirm')}
                      </p>

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setDeletingCommentId(null)}
                              className="flex-1 rounded-xl bg-gray-100 p-3 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                              {t('explore.report.cancel')}
                          </button>
                          <button 
                              onClick={submitDeleteComment}
                              className="flex-1 rounded-xl bg-red-600 p-3 text-sm font-bold text-white hover:bg-red-700"
                          >
                              {t('explore.report.delete') || 'Eliminar'}
                          </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  )
}
