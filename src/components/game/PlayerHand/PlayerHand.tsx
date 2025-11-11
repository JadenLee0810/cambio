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
    <div className="flex gap-4 justify-center items-end">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
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
  )
}