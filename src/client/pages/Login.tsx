import { motion } from 'framer-motion'
import { Shield, ArrowRight, Music } from 'lucide-react'

export default function Login() {
  const handleLogin = () => {
    // Redirect to backend auth which eventually redirects back to / (Home) or /select-guild
    window.location.href = '/v1/auth/login'
  }

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-gray-950">
      {/* Left Side - Form/Action */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-12 lg:w-1/2 lg:px-20 xl:px-24">
        <div className="mb-10 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <Music className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">Music Bot</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Bienvenido de nuevo
          </h1>
          <p className="mb-8 text-gray-500 dark:text-gray-400">
            Accede para administrar la música del bot y gestionar tu servidor.
          </p>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/50 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Iniciar sesión
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#4752C4] hover:shadow-lg hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              <Shield className="h-5 w-5" />
              <span>Continuar con Discord</span>
              <ArrowRight className="h-4 w-4 opacity-70" />
            </button>

            <p className="mt-4 text-center text-xs text-gray-400">
              Al continuar, aceptas nuestros términos de servicio.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Visual */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gray-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black opacity-90" />

        {/* Abstract Shapes/Gradients */}
        <div className="absolute -left-20 -top-20 h-[600px] w-[600px] rounded-full bg-primary-600/30 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-accent-600/20 blur-[120px]" />

        <div className="relative flex h-full flex-col items-center justify-center p-16 text-center text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative z-10 max-w-lg"
          >
            <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm shadow-2xl">
              <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 p-4 ring-1 ring-white/10">
                {/* Mock UI */}
                <div className="mb-4 flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex gap-4">
                  <div className="h-24 w-24 rounded-lg bg-primary-500/20 animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/5" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-8 w-8 rounded-full bg-white/10" />
                      <div className="h-8 w-8 rounded-full bg-white/10" />
                      <div className="h-8 w-8 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="mb-4 text-3xl font-bold">Control Total</h2>
            <p className="text-lg text-gray-300">
              Gestiona la reproducción, organiza tu cola y configura tu bot desde un panel moderno y
              elegante.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
