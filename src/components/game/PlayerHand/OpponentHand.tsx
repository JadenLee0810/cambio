'use client'

import { Card } from '@/components/game/Card/Card'
import { Player } from '@/types/player'

interface OpponentHandProps {
  player: Player
}

export const OpponentHand = ({ player }: OpponentHandProps) => {
  return (
    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
      <div className="text-white font-bold mb-2 text-center">{player.username}</div>
      
      {/* 2x2 Grid for opponent cards */}
      <div className="flex flex-col gap-2">
        {/* Top row */}
        <div className="flex gap-2">
          {player.hand.slice(0, 2).map((card) => (
            <div key={card.id} className="transform scale-75">
              <Card
                card={card}
                isFaceUp={card.isFaceUp}
              />
            </div>
          ))}
        </div>
        
        {/* Bottom row */}
        <div className="flex gap-2">
          {player.hand.slice(2, 4).map((card) => (
            <div key={card.id} className="transform scale-75">
              <Card
                card={card}
                isFaceUp={card.isFaceUp}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Score display */}
      <div className="text-white text-sm text-center mt-2">
        Cards: {player.hand.length}
      </div>
    </div>
  )
}