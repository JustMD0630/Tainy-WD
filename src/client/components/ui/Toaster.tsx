import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore, type Toast } from '@/stores/toast'

const icons = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
}

const colors = {
  success: 'border-green-500/20 bg-green-50 dark:bg-green-900/10',
  error: 'border-red-500/20 bg-red-50 dark:bg-red-900/10',
  info: 'border-blue-500/20 bg-blue-50 dark:bg-blue-900/10',
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-xl ${colors[toast.type]} dark:border-white/5 dark:shadow-black/50`}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <p className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export default function Toaster() {
  const { toasts } = useToastStore()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 outline-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
