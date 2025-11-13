'use client'

import { Card } from '../Card/Card'
import { CardInHand } from '@/types/card'

interface PlayerHandProps {
  cards: (CardInHand | null)[]
  isMyTurn: boolean
  onCardClick: (card: CardInHand) => void
}

export const PlayerHand = ({ cards, isMyTurn, onCardClick }: PlayerHandProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card, index) => (
        <div key={card?.id || `empty-${index}`}>
          {card ? (
            <Card
              card={card}
              isFaceUp={card.isFaceUp}
              isPlayable={isMyTurn}
              onClick={() => onCardClick(card)}
            />
          ) : (
            <div className="w-24 h-36 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/50"></div>
          )}
        </div>
      ))}
    </div>
  )
}