import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, AlertTriangle, Info, Trash2 } from 'lucide-react'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'

export default function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' }) {
    const { user } = useAuthStore()
    const { notifications, unreadCount, markAsRead, deleteNotification } = useNotificationStore()
    const [show, setShow] = useState(false)
    const [selectedNote, setSelectedNote] = useState<any>(null)
    const ref = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setShow(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleToggle = () => {
        if (!show && unreadCount > 0 && user) {
            markAsRead(user.id)
        }
        setShow(!show)
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (user) deleteNotification(id, user.id)
    }

    if (!user) return null

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={handleToggle}
                className="relative p-2 text-slate-400 transition-colors hover:text-white hover:bg-white/5 rounded-full"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#18191c]">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute mt-2 w-80 sm:w-96 rounded-2xl border border-white/10 bg-[#1e1f22] shadow-2xl shadow-black/50 overflow-hidden z-50 ${
                            align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                        }`}
                    >
                        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-[#2b2d31]">
                            <h3 className="font-bold text-white">Notificaciones</h3>
                            <button onClick={() => setShow(false)} className="text-slate-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                                    <Bell size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm">No tienes notificaciones nuevas</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => setSelectedNote(n)}
                                        className={`group relative flex gap-3 rounded-xl p-3 transition-colors cursor-pointer ${n.read ? 'bg-transparent hover:bg-white/5' : 'bg-indigo-500/10 hover:bg-indigo-500/20'}`}
                                    >
                                        <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                            n.type === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                                            n.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                            n.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {n.type === 'warn' ? <AlertTriangle size={16} /> :
                                             n.type === 'error' ? <X size={16} /> :
                                             n.type === 'success' ? <Check size={16} /> :
                                             <Info size={16} />}
                                        </div>
                                        <div className="flex-1 pr-6">
                                            <h4 className="text-sm font-bold text-white">{n.title}</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{n.message}</p>
                                            <p className="text-[10px] text-slate-600 mt-2">{new Date(n.created).toLocaleString()}</p>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => handleDelete(e, n.id)}
                                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400"
                                            title="Borrar notificación"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        {!n.read && (
                                            <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] group-hover:opacity-0" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedNote && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNote(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg rounded-2xl bg-[#1e1f22] p-6 shadow-2xl border border-white/10"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                                    selectedNote.type === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                                    selectedNote.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                    selectedNote.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {selectedNote.type === 'warn' ? <AlertTriangle size={24} /> :
                                     selectedNote.type === 'error' ? <X size={24} /> :
                                     selectedNote.type === 'success' ? <Check size={24} /> :
                                     <Info size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedNote.title}</h3>
                                    <p className="text-sm text-slate-400">{new Date(selectedNote.created).toLocaleString()}</p>
                                </div>
                            </div>
                            
                            <div className="bg-[#18191c] rounded-xl p-4 border border-white/5 mb-6">
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {selectedNote.message}
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <button 
                                    onClick={() => setSelectedNote(null)}
                                    className="px-6 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-colors"
                                >
                                    Entendido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
