'use client'

import { Card } from '@/types/card'

interface PlayerHandProps {
  cards: Card[]
  isMyTurn: boolean
  onCardClick: (card: Card) => void
  highlightedCardId?: string | null
  recentlyChangedCardId?: string | null
}

export function PlayerHand({ 
  cards, 
  isMyTurn, 
  onCardClick,
  highlightedCardId,
  recentlyChangedCardId
}: PlayerHandProps) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-white font-bold mb-2">Your Hand</p>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card: any, index: number) => {
          if (!card) {
            // Empty space for discarded card
            return (
              <div 
                key={index} 
                className="w-32 h-48 border-2 border-dashed border-slate-600 rounded-lg bg-slate-800/30"
              />
            )
          }

          const isHighlighted = highlightedCardId === card.id
          const isRecentlyChanged = recentlyChangedCardId === card.id

          return (
            <div 
              key={card.id} 
              onClick={() => isMyTurn && onCardClick(card)}
              className={`w-32 h-48 transition-all duration-300 ${
                isMyTurn ? 'cursor-pointer hover:scale-105' : ''
              } ${
                isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : ''
              } ${
                isRecentlyChanged ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
              }`}
            >
              {card.isFaceUp ? (
                <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                  <div className="text-xl font-bold" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                    <div>{card.rank}</div>
                    <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-4xl" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                    {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-red-600 rounded-lg border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl transform -rotate-45">CAMBIO</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}