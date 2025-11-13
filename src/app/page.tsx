'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-12"
      >
        {/* Game name with card icon */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-7xl">🃏</div>
          <h1 className="text-8xl font-serif font-bold text-white tracking-tight">
            Cambio
          </h1>
        </div>

        {/* Play button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/lobby')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-16 py-5 rounded-full text-2xl font-bold shadow-2xl hover:shadow-blue-500/50 transition-all"
        >
          Play
        </motion.button>
      </motion.div>
    </div>
  )
}