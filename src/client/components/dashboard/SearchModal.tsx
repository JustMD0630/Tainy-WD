import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { msToTime } from './time'
import { apiFetch } from '@/lib/api'
import { useState } from 'react'
import { usePlayerStore } from '@/stores/player'

type SearchTrack = {
  title: string
  uri: string
  length: number
  thumbnail: string
  author: string
  encoded?: string
  sourceName?: string
}

export default function SearchModal({
  open,
  onClose,
  requesterId,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  requesterId: string
  onAdd: (uri: string) => Promise<boolean>
}) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<SearchTrack[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSearch = async () => {
    if (busy || q.trim().length < 2 || requesterId.trim().length < 3) return
    setMsg(null)
    setBusy(true)
    const r = await apiFetch<{ tracks: SearchTrack[] }>(
      `/v1/search?identifier=${encodeURIComponent(q)}&requester=${encodeURIComponent(requesterId)}`,
      { method: 'GET' }
    )
    setBusy(false)
    if (!r.ok) {
      setMsg({ ok: false, text: r.error })
      return
    }
    setResults(r.data.tracks || [])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 backdrop-blur-sm md:items-center">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="border-b border-slate-200 p-4 md:p-5 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold">Buscar y añadir</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Busca en catálogo y manda a cola.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose()
                setResults([])
                setQ('')
                setMsg(null)
              }}
              className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              id="search-input"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
              placeholder="ytsearch: nombre / link / query"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              disabled={busy || q.trim().length < 2 || requesterId.trim().length < 3}
              onClick={handleSearch}
              className={[
                'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                busy || q.trim().length < 2
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-slate-900 text-white hover:bg-slate-800',
              ].join(' ')}
            >
              <Search className="h-4 w-4" />
              {busy ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {msg ? (
            <div
              className={[
                'mt-3 rounded-2xl px-3 py-2 text-xs font-medium',
                msg.ok
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
              ].join(' ')}
            >
              {msg.text}
            </div>
          ) : null}
        </div>

        <div className="max-h-[420px] overflow-auto p-4 md:p-5">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Sin resultados.
            </div>
          ) : (
            <div className="space-y-2">
              {results.slice(0, 20).map((t) => (
                <div
                  key={t.uri}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-700">
                    {t.thumbnail ? (
                      <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {t.author}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {msToTime(t.length)}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setMsg(null)
                      // Prioritize encoded track to ensure exact match
                      const query = t.encoded 
                        ? `encoded:${t.encoded}` 
                        : (t.uri?.trim() || `${t.title} ${t.author}`)
                        
                      const ok = await onAdd(query)
                      const detail = usePlayerStore.getState().error
                      setMsg({
                        ok,
                        text: ok ? 'Añadido a la cola' : detail || 'No se pudo añadir esta canción',
                      })
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-sky-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
