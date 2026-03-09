import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Plus, Trash2, Save, Music2, Play, X, Calendar, Clock, Edit2, Lock, Unlock, Hash, Image as ImageIcon, Upload, GripVertical } from 'lucide-react'
import ImageCropper from '@/components/common/ImageCropper'
import { apiFetch } from '@/lib/api'
import { useTranslation } from 'react-i18next'

// Helper function to format duration
function formatDuration(ms?: number) {
  if (!ms) return '--:--'
  const seconds = Math.floor((ms / 1000) % 60)
  const minutes = Math.floor((ms / (1000 * 60)) % 60)
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
  
  const s = seconds < 10 ? '0' + seconds : seconds
  if (hours > 0) {
      const m = minutes < 10 ? '0' + minutes : minutes
      return `${hours}:${m}:${s}`
  }
  return `${minutes}:${s}`
}

export type PlaylistTrack = {
  title: string
  uri: string
  author?: string
  length?: number
  thumbnail?: string
  requester?: any
}

export type Playlist = {
  id: string
  name: string
  tracks: PlaylistTrack[]
  createdAt: string
  updatedAt: string
  owner: string
  description?: string
  private?: boolean
  commentsDisabled?: boolean
  image?: string
}

export default function PlaylistsSection({
  guildId,
  playlists,
  selectedId,
  setSelectedId,
  selected,
  newName,
  setNewName,
  editingName,
  setEditingName,
  saving,
  onCreate,
  onSaveName,
  onDelete,
  onRemoveTrack,
  onReorderTracks,
  onSendToQueue,
  forceEditMode = false
}: {
  guildId: string
  playlists: Playlist[]
  selectedId: string
  setSelectedId: (v: string) => void
  selected: Playlist | null
  newName: string
  setNewName: (v: string) => void
  editingName: string
  setEditingName: (v: string) => void
  saving: boolean
  forceEditMode?: boolean
  onCreate: (name: string) => Promise<void>
  onSaveName: (name: string, isPrivate: boolean, description: string, commentsDisabled: boolean, image: string) => Promise<void>
  onDelete: () => Promise<void>
  onRemoveTrack: (idx: number) => Promise<void>
  onReorderTracks: (tracks: PlaylistTrack[]) => Promise<void>
  onSendToQueue: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    private: true,
    commentsDisabled: false,
    image: '',
    id: '' // Add ID field to state
  })

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [trackToDelete, setTrackToDelete] = useState<number | null>(null)

  const [localTracks, setLocalTracks] = useState<(PlaylistTrack & { _id: string })[]>([])

  useEffect(() => {
    if (selected) {
      setLocalTracks(selected.tracks.map(t => ({ ...t, _id: crypto.randomUUID() })))
    } else {
      setLocalTracks([])
    }
  }, [selected])

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selected) {
      setEditForm({
        name: selected.name,
        description: selected.description || '',
        private: selected.private ?? true,
        commentsDisabled: selected.commentsDisabled ?? false,
        image: selected.image || '',
        id: selected.id
      })
      // If force edit mode is enabled for this playlist, open editor
      if (forceEditMode) {
          setIsEditing(true)
      }
    }
  }, [selected, forceEditMode])

  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [tempImage, setTempImage] = useState<string | null>(null)
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File too large (max 5MB)')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
        setTempImage(reader.result as string)
        setCropModalOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = '' // Reset input
  }

  const handleCropConfirm = async (croppedImage: string) => {
    setCropModalOpen(false)
    setUploading(true)
    
    try {
        const r = await apiFetch<{ url: string }>('/v1/upload', {
          method: 'POST',
          body: JSON.stringify({ image: croppedImage })
        })

        if (r.ok) {
          // Delete old image if it's a local upload
          if (editForm.image && editForm.image.startsWith('/uploads/')) {
             await apiFetch('/v1/upload/delete', {
                 method: 'POST',
                 body: JSON.stringify({ url: editForm.image })
             })
          }
          setEditForm(prev => ({ ...prev, image: r.data.url }))
        } else {
          alert('Upload failed')
        }
    } catch (err) {
        console.error(err)
        alert('Upload failed')
    } finally {
        setUploading(false)
        setTempImage(null)
    }
  }

  const handleRemoveImage = async () => {
      if (editForm.image && editForm.image.startsWith('/uploads/')) {
          await apiFetch('/v1/upload/delete', {
              method: 'POST',
              body: JSON.stringify({ url: editForm.image })
          })
      }
      setEditForm(prev => ({ ...prev, image: '' }))
  }

  const openEditor = () => {
    if (selected) {
      setEditForm({
        name: selected.name,
        description: selected.description || '',
        private: selected.private ?? true,
        commentsDisabled: selected.commentsDisabled ?? false,
        image: selected.image || '',
        id: selected.id
      })
      setIsEditing(true)
    }
  }

  // Limits based on src/commands/Playlist/Create.ts
  const LIMITS = {
    name: 16,
    description: 1000
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 max-h-full">
      <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('library.playlists.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('library.playlists.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {isCreating ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent dark:scrollbar-thumb-gray-800">
        {cropModalOpen && tempImage && (
            <div className="fixed inset-0 z-[60]">
                <ImageCropper 
                    image={tempImage}
                    onCancel={() => { setCropModalOpen(false); setTempImage(null); }}
                    onConfirm={handleCropConfirm}
                />
            </div>
        )}

        <AnimatePresence>
          {trackToDelete !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                    <Trash2 size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    ¿Eliminar canción?
                </h3>
                
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    ¿Estás seguro de que quieres eliminar esta canción de la playlist?
                </p>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setTrackToDelete(null)}
                        className="flex-1 rounded-xl bg-gray-100 p-3 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => {
                            if (trackToDelete !== null) {
                                onRemoveTrack(trackToDelete)
                                setTrackToDelete(null)
                            }
                        }}
                        className="flex-1 rounded-xl bg-red-600 p-3 text-sm font-bold text-white hover:bg-red-700"
                    >
                        Eliminar
                    </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                    <Trash2 size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    ¿Eliminar playlist?
                </h3>
                
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Esta acción no se puede deshacer. La playlist "{selected?.name}" se eliminará permanentemente.
                </p>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="flex-1 rounded-xl bg-gray-100 p-3 text-sm font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => {
                            onDelete()
                            setIsDeleteModalOpen(false)
                        }}
                        className="flex-1 rounded-xl bg-red-600 p-3 text-sm font-bold text-white hover:bg-red-700"
                    >
                        Eliminar
                    </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex gap-2 p-1">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('library.playlistSection.createPlaceholder')}
                  className="flex-1 rounded-lg border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-primary-500 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-900"
                  autoFocus
                />
                <button
                  disabled={newName.trim().length < 2}
                  onClick={() => {
                    onCreate(newName.trim())
                    setIsCreating(false)
                  }}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('library.playlistSection.createButton')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {playlists.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center dark:border-gray-800 dark:bg-gray-900/50">
              <Music2 className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('library.playlistSection.noPlaylists')}
              </p>
            </div>
          ) : (
            <div className="grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent dark:scrollbar-thumb-gray-800">
              {playlists.map((p) => (
                <motion.div
                  key={p.id}
                  layoutId={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`group relative cursor-pointer rounded-xl border p-4 transition-all ${
                    selectedId === p.id
                      ? 'border-primary-200 bg-primary-50 dark:border-primary-900/50 dark:bg-primary-900/10'
                      : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm dark:bg-gray-800/50 dark:hover:bg-gray-800 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-cover shadow-sm flex-shrink-0" 
                        />
                      ) : (
                        <div
                          className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg shadow-sm flex-shrink-0 ${
                            selectedId === p.id
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:group-hover:bg-gray-600'
                          }`}
                        >
                          <Music2 size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3
                          className={`font-bold truncate ${selectedId === p.id ? 'text-primary-900 dark:text-primary-100' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          {p.name}
                        </h3>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                          {p.tracks.length} {t('library.playlistSection.tracks')}
                        </p>
                      </div>
                    </div>
                    {selectedId === p.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-primary-600 dark:text-primary-400"
                      >
                        <Play size={16} fill="currentColor" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 my-8"
              >
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-gray-800">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                    <Edit2 size={20} className="text-primary-500" />
                    {t('library.playlistSection.editor.title')}
                  </h3>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
                    {t('library.playlistSection.editor.warning')}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      ID
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        disabled
                        value={editForm.id} // ID editing not supported yet in backend for simplicity, or we can add it later
                        className="w-full rounded-lg border border-gray-200 bg-gray-100 py-2 pl-9 pr-4 text-sm text-gray-500 outline-none cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        title="ID editing not supported"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('library.playlistSection.editor.nameLabel')}
                      <span className={`${editForm.name.length > LIMITS.name ? 'text-red-500' : ''}`}>
                        {editForm.name.length}/{LIMITS.name}
                      </span>
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={`w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-1 dark:text-white ${
                        editForm.name.length > LIMITS.name 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10' 
                          : 'border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                      placeholder={t('library.playlistSection.editor.namePlaceholder')}
                    />
                    {editForm.name.length > LIMITS.name && (
                        <p className="text-[10px] text-red-500 font-medium">Name too long (Max {LIMITS.name})</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('library.playlistSection.editor.descLabel')}
                      <span className={`${editForm.description.length > LIMITS.description ? 'text-red-500' : ''}`}>
                        {editForm.description.length}/{LIMITS.description}
                      </span>
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className={`w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-1 dark:text-white ${
                        editForm.description.length > LIMITS.description 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10' 
                          : 'border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                      placeholder={t('library.playlistSection.editor.descPlaceholder')}
                      rows={2}
                    />
                    {editForm.description.length > LIMITS.description && (
                        <p className="text-[10px] text-red-500 font-medium">Description too long (Max {LIMITS.description})</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Imagen de Portada
                    </label>
                    <div className="flex items-center gap-3">
                        {editForm.image ? (
                            <div className="relative h-12 w-12 shrink-0 group">
                                <img 
                                    src={editForm.image} 
                                    className="h-full w-full rounded-lg object-cover shadow-sm ring-1 ring-gray-200 dark:ring-gray-700" 
                                />
                                <button
                                    onClick={handleRemoveImage}
                                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                                    title="Eliminar imagen"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                                <ImageIcon size={20} />
                            </div>
                        )}
                        
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            {uploading ? <Clock className="animate-spin" size={16} /> : <Upload size={16} />}
                            {editForm.image ? 'Cambiar Imagen' : 'Subir Imagen'}
                        </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('library.playlistSection.editor.visibilityLabel')}
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, private: false })}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium transition-all ${
                                editForm.private === false
                                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                            }`}
                        >
                            <Unlock size={16} /> {t('library.playlists.public')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, private: true })}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium transition-all ${
                                editForm.private === true
                                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
                                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                            }`}
                        >
                            <Lock size={16} /> {t('library.playlists.private')}
                        </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t('library.playlistSection.editor.commentsLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, commentsDisabled: !editForm.commentsDisabled })}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium transition-all ${
                                !editForm.commentsDisabled
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                            }`}
                        >
                            {!editForm.commentsDisabled ? t('library.playlistSection.editor.commentsOn') : t('library.playlistSection.editor.commentsOff')}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">
                        {editForm.commentsDisabled ? t('library.playlistSection.editor.commentsDescOff') : t('library.playlistSection.editor.commentsDescOn')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    {t('library.playlistSection.editor.cancel')}
                  </button>
                  <button
                    disabled={saving || editForm.name.length > LIMITS.name || editForm.description.length > LIMITS.description || editForm.name.trim().length < 2}
                    onClick={() => {
                        onSaveName(editForm.name, editForm.private, editForm.description, editForm.commentsDisabled, editForm.image)
                        setIsEditing(false)
                    }}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('library.playlistSection.editor.submit')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800"
            >
              <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {selected.image && (
                            <img 
                                src={selected.image} 
                                alt={selected.name} 
                                className="h-16 w-16 rounded-xl object-cover shadow-sm shrink-0" 
                            />
                        )}
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-2">
                            {selected.name}
                        </h2>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={openEditor}
                        className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Edit2 size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Eliminar playlist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {selected.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          {selected.description}
                      </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{new Date(selected.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{selected.tracks.length} canciones</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {selected.private ? <Lock size={12} /> : <Unlock size={12} />}
                        <span>{selected.private ? 'Privada' : 'Pública'}</span>
                    </div>
                  </div>
              </div>

              <div className="custom-scrollbar max-h-[300px] overflow-y-auto pr-1">
                <Reorder.Group axis="y" values={localTracks} onReorder={setLocalTracks}>
                  {localTracks.map((t, idx) => (
                    <Reorder.Item
                      key={t._id}
                      value={t}
                      onDragEnd={() => {
                        // Remove _id before sending back to parent
                        onReorderTracks(localTracks.map(({ _id, ...rest }) => rest))
                      }}
                      className="group mb-2 flex items-center justify-between rounded-lg p-2 hover:bg-gray-50 transition-colors dark:hover:bg-gray-800 cursor-grab active:cursor-grabbing bg-white dark:bg-gray-900 border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                    >
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className="text-gray-300 dark:text-gray-600">
                          <GripVertical size={16} />
                        </div>
                        <span className="w-5 flex-shrink-0 text-xs font-mono text-gray-400">{idx + 1}</span>
                        <div className="flex items-center gap-2 min-w-0">
                            {t.thumbnail && (
                                <img src={t.thumbnail} alt={t.title} className="h-8 w-8 rounded object-cover flex-shrink-0 pointer-events-none" />
                            )}
                            <div className="flex flex-col min-w-0">
                              <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t.title}
                              </p>
                              <p className="truncate text-xs text-gray-500 dark:text-gray-500">
                                {t.author || 'Desconocido'} • {formatDuration(t.length)}
                              </p>
                            </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setTrackToDelete(idx)
                        }}
                        className="rounded-md p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              <button
                disabled={!guildId || selected.tracks.length === 0}
                onClick={onSendToQueue}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition-all hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                <Play size={16} fill="currentColor" />
                Reproducir Playlist
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
