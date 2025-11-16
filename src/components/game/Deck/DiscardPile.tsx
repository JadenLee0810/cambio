'use client'

import { Card } from '@/types/card'

interface DiscardPileProps {
  cards: Card[]
  onDraw: () => void
  canDraw: boolean
}

export function DiscardPile({ cards, onDraw, canDraw }: DiscardPileProps) {
  const topCard = cards[cards.length - 1]

  if (!topCard) {
    return (
      <div className="flex flex-col items-center">
        <p className="text-white font-bold mb-2">Discard Pile</p>
        <div className="w-32 h-48 bg-slate-700 rounded-lg border-2 border-dashed border-slate-500 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Empty</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-white font-bold mb-2">Discard Pile ({cards.length})</p>
      <div 
        onClick={canDraw ? onDraw : undefined}
        className={`w-32 h-48 ${canDraw ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'} transition-transform`}
      >
        <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col pointer-events-none">
          <div className="text-xl font-bold" style={{ color: topCard.suit === 'hearts' || topCard.suit === 'diamonds' ? 'red' : 'black' }}>
            <div>{topCard.rank}</div>
            <div>{topCard.suit === 'hearts' ? '♥' : topCard.suit === 'diamonds' ? '♦' : topCard.suit === 'clubs' ? '♣' : '♠'}</div>
          </div>
          <div className="flex-1 flex items-center justify-center text-4xl" style={{ color: topCard.suit === 'hearts' || topCard.suit === 'diamonds' ? 'red' : 'black' }}>
            {topCard.suit === 'hearts' ? '♥' : topCard.suit === 'diamonds' ? '♦' : topCard.suit === 'clubs' ? '♣' : '♠'}
          </div>
        </div>
      </div>
      {canDraw && (
        <p className="text-green-400 text-sm mt-2">Click to draw</p>
      )}
    </div>
  )
}