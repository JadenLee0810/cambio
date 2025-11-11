'use client'

import { Card as CardType } from '@/types/card'
import { CardFront } from '@/components/game/Card/CardFront'
import { motion } from 'framer-motion'

interface DiscardPileProps {
  cards: CardType[]
  onDraw?: () => void
  canDraw?: boolean
}

export const DiscardPile = ({ cards, onDraw, canDraw }: DiscardPileProps) => {
  const topCard = cards[cards.length - 1]
  
  if (!topCard) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-24 h-36 border-2 border-dashed border-white border-opacity-50 rounded-lg flex items-center justify-center">
          <span className="text-white text-opacity-50 text-xs">Empty</span>
        </div>
        <div className="text-white text-sm font-semibold bg-black bg-opacity-50 px-3 py-1 rounded-full">
          Discard
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`relative w-24 h-36 ${canDraw ? 'cursor-pointer' : ''}`}
        onClick={canDraw ? onDraw : undefined}
        whileHover={canDraw ? { scale: 1.05 } : {}}
        whileTap={canDraw ? { scale: 0.95 } : {}}
      >
        <CardFront card={topCard} />
      </motion.div>
      <div className="text-white text-sm font-semibold bg-black bg-opacity-50 px-3 py-1 rounded-full">
        Discard ({cards.length})
      </div>
    </div>
  )
}