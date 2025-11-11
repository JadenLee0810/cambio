'use client'

import { motion } from 'framer-motion'

interface DeckProps {
  cardCount: number
  onDraw?: () => void
  canDraw?: boolean
}

export const Deck = ({ cardCount, onDraw, canDraw }: DeckProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`relative w-24 h-36 ${canDraw ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        onClick={canDraw ? onDraw : undefined}
        whileHover={canDraw ? { scale: 1.05 } : {}}
        whileTap={canDraw ? { scale: 0.95 } : {}}
      >
        {/* Stack effect - multiple card backs */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-900 shadow-lg transform translate-x-1 translate-y-1" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-900 shadow-lg transform translate-x-0.5 translate-y-0.5" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-900 shadow-lg flex items-center justify-center">
          <div className="text-white text-4xl font-bold opacity-30">C</div>
        </div>
      </motion.div>
      <div className="text-white text-sm font-semibold bg-black bg-opacity-50 px-3 py-1 rounded-full">
        {cardCount} cards
      </div>
    </div>
  )
}