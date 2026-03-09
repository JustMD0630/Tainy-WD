import { motion } from 'framer-motion'
import { RotateCw, Search, Music2, Disc, Heart } from 'lucide-react'
import { msToTime } from './time'
import type { Track } from '@/stores/player'

export default function NowPlayingCard({
  current,
  position,
  progress,
  onRefresh,
  onOpenSearch,
  onAddToPlaylist
}: {
  current: Track | null
  position: number
  progress: number
  onRefresh: () => void
  onOpenSearch: () => void
  onAddToPlaylist: (track: Track) => void
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/50 p-8 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl dark:border-gray-800 dark:bg-gray-900/50">
      {/* Background Gradient Effect - More vibrant */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-500/20" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[100px] dark:bg-purple-500/20" />

      <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
        {/* Artwork - Larger and with Vinyl effect */}
        <div className="relative shrink-0 group">
          <div className={`relative h-48 w-48 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5 transition-transform duration-700 md:h-56 md:w-56 dark:ring-white/10 ${current ? 'hover:scale-[1.02]' : ''}`}>
            {current?.thumbnail ? (
              <img
                src={current.thumbnail}
                alt={current.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                <Music2 className="h-16 w-16 text-gray-400 opacity-50" />
              </div>
            )}
            
            {/* Vinyl overlay effect */}
            {current && (
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            )}
          </div>
          
          {/* Animated Glow behind artwork if playing */}
          {current && (
            <div className="absolute inset-0 -z-10 translate-y-4 scale-90 blur-2xl transition-all duration-700 group-hover:translate-y-6 group-hover:scale-95 group-hover:blur-3xl">
              <div className="h-full w-full rounded-full bg-indigo-500/30 dark:bg-indigo-500/20" />
            </div>
          )}
        </div>

        {/* Info & Controls */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Disc className="h-3 w-3 animate-spin-slow" />
              <span>Ahora sonando</span>
            </div>
            <div className="flex items-center gap-2">
              {current && (
                  <button
                    onClick={() => onAddToPlaylist(current)}
                    className="rounded-full p-2.5 text-gray-500 transition-all hover:bg-pink-100 hover:text-pink-600 dark:text-gray-400 dark:hover:bg-pink-900/20 dark:hover:text-pink-400"
                    title="Añadir a Playlist"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
              )}
              <button
                onClick={onRefresh}
                className="rounded-full p-2.5 text-gray-500 transition-all hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
                title="Actualizar"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={onOpenSearch}
                className="group flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-gray-900/10 transition-all hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                <Search className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                <span>Buscar Canción</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="truncate text-3xl font-black tracking-tight text-gray-900 dark:text-white md:text-4xl">
                {current?.title || 'Silencio...'}
            </h2>
            <p className="truncate text-lg font-medium text-gray-500 dark:text-gray-400">
                {current?.author || 'Añade canciones a la cola para empezar la fiesta'}
            </p>
          </div>

          {/* Progress Bar - Modern */}
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-xs font-bold tracking-wide text-gray-400 dark:text-gray-500">
              <span>{msToTime(position)}</span>
              <span>{msToTime(current?.length ?? 0)}</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.2, ease: 'linear' }}
              />
              {/* Glow effect on progress bar tip */}
              <motion.div 
                className="absolute inset-y-0 w-2 rounded-full bg-white blur-[2px]"
                animate={{ left: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.2, ease: 'linear' }}
                style={{ translateX: '-50%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
