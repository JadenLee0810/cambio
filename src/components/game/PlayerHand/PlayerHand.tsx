'use client'

import { Card } from '@/components/game/Card/Card'
import { CardInHand } from '@/types/card'
import { motion } from 'framer-motion'

interface PlayerHandProps {
  cards: CardInHand[]
  onCardClick?: (card: CardInHand) => void
  isMyTurn: boolean
}

export const PlayerHand = ({ cards, onCardClick, isMyTurn }: PlayerHandProps) => {
  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              card={card}
              isFaceUp={card.isFaceUp}
              isPlayable={isMyTurn}
              onClick={() => onCardClick?.(card)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}