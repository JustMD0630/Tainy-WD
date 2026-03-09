import { motion } from 'framer-motion'
import { Plus, Search, ListPlus, Music, Play } from 'lucide-react'
import { msToTime } from '@/components/dashboard/time'
import { useTranslation } from 'react-i18next'

export type SearchTrack = {
  title: string
  uri: string
  length: number
  thumbnail: string
  author: string
  encoded?: string
  sourceName?: string
}

export default function SearchSection({
  guildId,
  query,
  setQuery,
  busy,
  results,
  onSearch,
  onAddToQueue,
  onAddToPlaylist,
  playlistEnabled,
  searchEnabled,
}: {
  guildId: string
  query: string
  setQuery: (v: string) => void
  busy: boolean
  results: SearchTrack[]
  onSearch: () => Promise<void>
  onAddToQueue: (uri: string, encoded?: string) => Promise<void>
  onAddToPlaylist: (track: SearchTrack) => Promise<void>
  playlistEnabled: boolean
  searchEnabled: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('library.searchSection.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('library.searchSection.subtitle')}
          </p>
        </div>
        {guildId && (
          <div className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            {t('library.searchSection.connected')}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="relative group z-10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchEnabled && onSearch()}
            placeholder={t('library.search.placeholder')}
            className="w-full rounded-xl border-gray-200 bg-gray-50 pl-12 pr-24 py-3.5 text-sm text-gray-900 placeholder-gray-500 outline-none ring-1 ring-transparent focus:bg-white focus:ring-primary-500 transition-all dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:bg-gray-900"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <button
              type="button"
              disabled={busy || query.trim().length < 2 || !searchEnabled}
              onClick={onSearch}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {busy ? '...' : t('library.search.button')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent dark:scrollbar-thumb-gray-800">
        {results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 min-h-[300px]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800">
              <Search className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {t('library.searchSection.emptyTitle')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('library.searchSection.emptySubtitle')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.slice(0, 50).map((track, idx) => (
              <motion.div
                key={track.uri + idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group flex items-center gap-4 rounded-xl border border-transparent bg-gray-50 p-2 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all dark:bg-gray-800/50 dark:hover:border-gray-700 dark:hover:bg-gray-800"
              >
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 shadow-sm dark:bg-gray-700">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <Music size={20} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all group-hover:opacity-100">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                    {track.title}
                  </h3>
                  <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                    {track.author}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {msToTime(track.length)}
                </div>

                <div className="flex gap-2 opacity-0 transition-all transform translate-x-2 group-hover:translate-x-0 group-hover:opacity-100">
                  <button
                    disabled={!guildId}
                    onClick={() => onAddToQueue(track.uri?.trim() || `${track.title} ${track.author}`, track.encoded)}
                    className="rounded-lg bg-gray-900 p-2 text-white shadow-sm transition-all hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                    title={t('library.searchSection.addToQueue')}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    disabled={!playlistEnabled}
                    onClick={() => onAddToPlaylist(track)}
                    className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-primary-600 hover:border-primary-200 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    title={t('library.searchSection.addToPlaylist')}
                  >
                    <ListPlus size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
