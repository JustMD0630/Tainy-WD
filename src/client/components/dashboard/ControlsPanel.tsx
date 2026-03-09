import { useState } from 'react'
import {
  Repeat,
  SkipBack,
  SkipForward,
  Trash2,
  Plus,
  Volume2,
  Play,
  Pause,
  Mic,
  Shuffle,
} from 'lucide-react'
import { msToTime } from './time'
import type { Track } from '@/stores/player'
import { useToastStore } from '@/stores/toast'

export default function ControlsPanel({
  loop,
  paused,
  current,
  position,
  volume,
  setVolume,
  seekValue,
  setSeekValue,
  seekDirty,
  setSeekDirty,
  onCreatePlayer,
  onDestroyPlayer,
  onControl,
  voiceChannel,
  voiceChannelName,
}: {
  loop: string
  paused: boolean
  current: Track | null
  position: number
  volume: number
  setVolume: (v: number) => void
  seekValue: number
  setSeekValue: (v: number) => void
  seekDirty: boolean
  setSeekDirty: (v: boolean) => void
  onCreatePlayer: () => void
  onDestroyPlayer: () => void
  onControl: (payload: Record<string, any>) => Promise<void>
  voiceChannelName?: string | null
}) {
  const { addToast } = useToastStore()
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({})

  const handleControl = async (action: string, payload: Record<string, any>) => {
    if (cooldowns[action]) return
    
    // Set cooldown
    setCooldowns(prev => ({ ...prev, [action]: true }))
    
    // Execute action
    await onControl(payload)
    
    // Reset cooldown after 3 seconds
    setTimeout(() => {
        setCooldowns(prev => ({ ...prev, [action]: false }))
    }, 3000)
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white/50 p-8 shadow-lg backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/50">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-center">
        {/* All Controls Grouped Together */}
        <div className="flex items-center justify-center gap-4">
            {/* Loop */}
            <button
            type="button"
            onClick={() => {
                if (!current) return 
                const modes = ['none', 'song', 'queue']
                const next = modes[(modes.indexOf(loop) + 1) % modes.length]
                const loopText = next === 'none' ? 'desactivado' : next === 'song' ? 'canción' : 'cola'
                
                handleControl('loop', { loop: next })
                addToast(`Bucle ${loopText}`, 'success')
            }}
            className={`p-2 transition ${loop !== 'none' ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'} ${(!current || cooldowns['loop']) ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={`Loop: ${loop}`}
            disabled={!current || cooldowns['loop']}
            >
            <Repeat className="h-5 w-5" />
            {loop !== 'none' && <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-current" />}
            </button>

            {/* Skip Back */}
            <button
            type="button"
            onClick={() => {
                if (!current) return
                handleControl('prev', { skipMode: 'previous' })
                addToast('Canción anterior', 'success')
            }}
            className={`p-2 text-gray-400 transition hover:text-gray-900 active:scale-95 dark:hover:text-white ${(!current || cooldowns['prev']) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!current || cooldowns['prev']}
            >
            <SkipBack className="h-8 w-8" />
            </button>

            {/* Play/Pause */}
            <button
            type="button"
            onClick={() => {
                if (!current) return
                handleControl('pause', { pause: !paused })
                addToast(paused ? 'Reproducción reanudada' : 'Reproducción pausada', 'success')
            }}
            className={`mx-2 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 hover:scale-105 active:scale-95 ${(!current || cooldowns['pause']) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!current || cooldowns['pause']}
            >
            {paused ? (
                <Play className="ml-1 h-8 w-8" fill="currentColor" />
            ) : (
                <Pause className="h-8 w-8" fill="currentColor" />
            )}
            </button>

            {/* Skip Forward */}
            <button
            type="button"
            onClick={() => {
                if (!current) return
                handleControl('skip', { skipMode: 'skip' })
                addToast('Canción saltada', 'success')
            }}
            className={`p-2 text-gray-400 transition hover:text-gray-900 active:scale-95 dark:hover:text-white ${(!current || cooldowns['skip']) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!current || cooldowns['skip']}
            >
            <SkipForward className="h-8 w-8" />
            </button>
            
            {/* Shuffle */}
            <button 
                type="button"
                onClick={() => {
                    if (!current) return
                    handleControl('shuffle', { shuffle: true })
                    addToast('Cola mezclada aleatoriamente', 'success')
                }}
                className={`p-2 text-gray-400 transition hover:text-gray-900 active:scale-95 dark:hover:text-white ${(!current || cooldowns['shuffle']) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!current || cooldowns['shuffle']}
                title="Aleatorio"
            >
            <Shuffle className="h-5 w-5" />
            </button>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
         <Volume2 className="h-5 w-5 text-gray-400" />
         <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            onMouseUp={(e) => onControl({ volume: String(e.currentTarget.value) })}
            onTouchEnd={(e) => onControl({ volume: String(e.currentTarget.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-indigo-600 dark:bg-gray-800"
          />
          <span className="w-12 text-right text-xs font-bold text-gray-500">{volume}%</span>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-6 dark:border-gray-800">
        <div className="flex items-center gap-2">
            {voiceChannel && (
                <a 
                    href={`https://discord.com/channels/${current?.requester ? 'me' : '@me'}/${voiceChannel}`} // Simple link to channel
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    title="Ir al canal de voz en Discord"
                >
                    <Mic className="h-3.5 w-3.5" />
                    <span className="group-hover:underline">
                        {voiceChannelName || voiceChannel}
                    </span>
                </a>
            )}
        </div>

        <div className="flex items-center gap-2">
            {!current && (
                <button
                type="button"
                onClick={onCreatePlayer}
                className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                >
                <Plus className="h-4 w-4" />
                Unirse
                </button>
            )}
            <button
                type="button"
                onClick={onDestroyPlayer}
                className="flex items-center gap-2 rounded-lg text-xs font-bold text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 dark:hover:text-red-400"
            >
                <Trash2 className="h-4 w-4" />
                Parar
            </button>
        </div>
      </div>
    </div>
  )
}
