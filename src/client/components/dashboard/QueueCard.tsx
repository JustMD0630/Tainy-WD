import { Reorder } from 'framer-motion'
import { msToTime } from './time'
import type { Track } from '@/stores/player'
import { Trash2, User, Music, Heart, GripVertical, Clock } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function QueueCard({
  queue,
  onRemove,
  onReorder,
  onAddToPlaylist,
}: {
  queue: Track[]
  onRemove?: (index: number) => void
  onReorder?: (from: number, to: number) => void
  onAddToPlaylist?: (track: Track) => void
}) {
  // State to hold the current order of URIs (stable IDs)
  // We only track UPCOMING tracks in the reorder state
  const [order, setOrder] = useState<string[]>([])
  const isDraggingRef = useRef(false)

  // Separate current and upcoming from PROPS (server truth)
  // queue[0] is current, queue.slice(1) is upcoming
  const currentTrack = queue[0]
  // FIX: Don't slice if queue is already upcoming-only.
  // The 'queue' prop passed from Dashboard usually includes current at index 0.
  // BUT if the user says "sometimes the first upcoming item disappears", it might be that
  // the backend sends upcoming as 'queue' and current separately.
  // Let's check getStatus.ts again.
  // getStatus.ts sends: { current: ..., queue: [upcoming...] }
  // Dashboard.tsx receives 'data' and passes 'data.queue' to QueueCard.
  // So 'queue' prop IS ALREADY UPCOMING ONLY.
  // Therefore, queue[0] is the FIRST UPCOMING TRACK, not current.
  
  const upcomingTracks = queue
  
  // Server-side upcoming IDs (snapshot of truth from props)
  const upcomingIds = upcomingTracks.map((t, i) => t.id || t.uri || `track-${i + 1}`)

  useEffect(() => {
    // Sync local order with server order
    if (!isDraggingRef.current) {
        setOrder(upcomingIds)
    }
  }, [JSON.stringify(upcomingIds)])

  const totalDuration = queue.reduce((acc, curr) => acc + (curr.length || 0), 0)

  // Derive the tracks to render based on 'order'
  const upcomingRenderList = order
    .map(id => upcomingTracks.find(t => (t.id || t.uri || `track-${queue.indexOf(t)}`) === id))
    .filter((t): t is Track => !!t)

  // Safety: append missing
  if (upcomingRenderList.length < upcomingTracks.length) {
      const renderedIds = new Set(upcomingRenderList.map(t => t.id || t.uri))
      const missing = upcomingTracks.filter(t => !renderedIds.has(t.id || t.uri))
      upcomingRenderList.push(...missing)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Cola de reproducción
          </div>
          <div className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-900 dark:bg-gray-800 dark:text-white">
            {upcomingTracks.length}
          </div>
        </div>
        {queue.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                <Clock size={12} />
                {msToTime(totalDuration)}
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {queue.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
              <Music className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">La cola está vacía</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Añade canciones para empezar la fiesta
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Draggable Group for Upcoming Tracks ONLY */}
            {upcomingTracks.length > 0 && (
             <div>
               <Reorder.Group 
                  axis="y" 
                  values={order} 
                  onReorder={(newOrder) => {
                      setOrder(newOrder)
                  }} 
                  className="space-y-2"
               >
                {upcomingRenderList.map((track) => {
                  const id = track.id || track.uri || ''
                  
                  // Global index in full queue (for remove button)
                  // Note: indexOf might be ambiguous if duplicates exist without IDs.
                  // But we use the object reference which is usually stable from store.
                  const trackInQueueIndex = queue.indexOf(track)
                  
                  return (
                    <QueueItem 
                      key={id} // Stable key
                      item={track} 
                      index={trackInQueueIndex} 
                      value={id} // Stable value for reorder
                      onRemoveCall={(i: number) => onRemove && onRemove(i)}
                      onAddToPlaylist={onAddToPlaylist}
                      isDraggable={true}
                      onDragStart={() => {
                          isDraggingRef.current = true
                      }}
                      onDragEnd={() => {
                          isDraggingRef.current = false
                          
                          if (!onReorder) return
                          
                          // Current position in the reordered list (0..N-1)
                          const newUpcomingIndex = order.indexOf(id)
                          // Original position in the server list (0..N-1)
                          const originalUpcomingIndex = upcomingIds.indexOf(id)
                          
                          // If moved
                          if (newUpcomingIndex !== originalUpcomingIndex && newUpcomingIndex !== -1 && originalUpcomingIndex !== -1) {
                              // CONVERT TO VISUAL INDICES (1-based)
                              // Because backend expects visual indices and subtracts 1
                              // visualFrom = originalUpcomingIndex + 1
                              // visualTo = newUpcomingIndex + 1
                              
                              const visualFrom = originalUpcomingIndex + 1
                              const visualTo = newUpcomingIndex + 1
                              
                              onReorder(visualFrom, visualTo)
                          }
                      }}
                    />
                  )
                })}
               </Reorder.Group>
             </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function QueueItem({ item, index, value, onRemoveCall, onAddToPlaylist, onDragEnd, onDragStart, isDraggable = true }: any) {
    return (
        <Reorder.Item
            value={value}
            className="relative"
            onDragEnd={onDragEnd}
            onDragStart={onDragStart}
        >
            <div
                className="group flex items-center gap-3 rounded-xl border border-transparent bg-white p-2 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm dark:bg-transparent dark:hover:border-gray-700 dark:hover:bg-gray-800 cursor-default"
            >
                <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-300">
                    <GripVertical size={16} />
                </div>
                
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 pointer-events-none">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 pointer-events-none">
                  <div className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {item.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                      {item.author}
                    </span>
                    {item.requester && (
                      <span className="flex items-center gap-1 rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                        <User size={10} />
                        {(item.requester as any).username || 'Usuario'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 pointer-events-none">
                    {msToTime(item.length)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {onAddToPlaylist && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onAddToPlaylist(item); }}
                          className="rounded p-1 text-gray-400 hover:bg-pink-50 hover:text-pink-500 dark:hover:bg-pink-900/20 dark:hover:text-pink-400"
                          title="Añadir a Playlist"
                        >
                          <Heart size={14} />
                        </button>
                    )}
                    {onRemoveCall && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveCall(index); }}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Eliminar de la cola"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
            </div>
        </Reorder.Item>
    )
}
