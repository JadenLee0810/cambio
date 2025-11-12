'use client'

import { Card as CardType } from '@/types/card'
import { Card } from '../Card/Card'

interface DiscardPileProps {
  cards: CardType[]
  onDraw?: () => void
  canDraw?: boolean
}

export const DiscardPile = ({ cards, onDraw, canDraw }: DiscardPileProps) => {
  const topCard = cards[cards.length - 1]
  
  if (!topCard) {
    return (
      <div className="w-24 h-36 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center">
        <span className="text-gray-400 text-sm">Empty</span>
      </div>
    )
  }
  
  return (
    <div
      onClick={canDraw ? onDraw : undefined}
      className={canDraw ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
    >
      <Card card={topCard} isFaceUp={true} />
    </div>
  )
}