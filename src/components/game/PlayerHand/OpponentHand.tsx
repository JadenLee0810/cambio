'use client'

import { Player } from '@/types/player'

interface OpponentHandProps {
  player: Player
  onCardClick: (card: any) => void
  clickable?: boolean
  highlightedCardId?: string | null
  recentlyChangedCardId?: string | null
}

export function OpponentHand({ 
  player, 
  onCardClick, 
  clickable = false,
  highlightedCardId,
  recentlyChangedCardId
}: OpponentHandProps) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-white font-bold mb-2">{player.username}</p>
      <div className="grid grid-cols-2 gap-3">
        {player.hand.map((card: any, index: number) => {
          if (!card) {
            // Empty space for discarded card
            return (
              <div 
                key={index} 
                className="w-24 h-36 border-2 border-dashed border-slate-600 rounded-lg bg-slate-800/30"
              />
            )
          }

          const isHighlighted = highlightedCardId === card.id
          const isRecentlyChanged = recentlyChangedCardId === card.id

          return (
            <div
              key={card.id}
              onClick={() => clickable && onCardClick(card)}
              className={`w-24 h-36 transition-all duration-300 ${
                clickable ? 'cursor-pointer hover:scale-105' : ''
              } ${
                isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : ''
              } ${
                isRecentlyChanged ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
              }`}
            >
              {card.isFaceUp ? (
                <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-1 flex flex-col">
                  <div className="text-sm font-bold" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                    <div>{card.rank}</div>
                    <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-2xl" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                    {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-red-600 rounded-lg border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg transform -rotate-45">CAMBIO</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}