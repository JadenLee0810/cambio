'use client'

import { Player } from '@/types/player'
import { Card } from '../Card/Card'

interface OpponentHandProps {
  player: Player
  onCardClick?: (card: any) => void
  clickable?: boolean
}

export const OpponentHand = ({ player, onCardClick, clickable = false }: OpponentHandProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-white font-bold mb-2">{player.username}</div>
      <div className="grid grid-cols-2 gap-2">
        {player.hand.map((card: any, index: number) => (
          <div 
            key={card?.id || `empty-${index}`}
            onClick={() => card && clickable && onCardClick ? onCardClick(card) : null}
            className={card && clickable ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
          >
            {card ? (
              <Card
                card={card}
                isFaceUp={card.isFaceUp}
                isPlayable={clickable}
              />
            ) : (
              <div className="w-24 h-36 border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/50"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}