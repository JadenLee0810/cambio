import React from 'react'
import { Card as CardType } from '@/types/card'

interface CardProps {
  card: CardType | null
  isFaceUp: boolean
  onClick?: () => void
  isClickable?: boolean
  isPlayable?: boolean  // Add this for compatibility
  isSelected?: boolean
}

export function Card({ card, isFaceUp, onClick, isClickable = false, isPlayable = false, isSelected = false }: CardProps) {
  if (!card) {
    return (
      <div className="w-24 h-36 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600" />
    )
  }

  const suitSymbols: { [key: string]: string } = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  const suitColor = isRed ? '#dc2626' : '#000000'
  const suitSymbol = suitSymbols[card.suit] || '?'
  
  // Support both isClickable and isPlayable props
  const canClick = isClickable || isPlayable

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`
        w-24 h-36 rounded-lg transition-all duration-200
        ${canClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''}
        ${isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''}
      `}
    >
      {isFaceUp ? (
        // Front of card
        <div className="w-full h-full bg-white rounded-lg shadow-lg border-2 border-gray-300 p-2 flex flex-col relative overflow-hidden">
          {/* Top left corner */}
          <div className="absolute top-1 left-2 flex flex-col items-center leading-none">
            <span className="text-lg font-bold" style={{ color: suitColor }}>
              {card.rank}
            </span>
            <span className="text-lg" style={{ color: suitColor }}>
              {suitSymbol}
            </span>
          </div>

          {/* Center suit symbol */}
          <div className="flex-1 flex items-center justify-center">
            <span className="text-5xl" style={{ color: suitColor }}>
              {suitSymbol}
            </span>
          </div>

          {/* Bottom right corner (rotated) */}
          <div className="absolute bottom-1 right-2 flex flex-col items-center leading-none rotate-180">
            <span className="text-lg font-bold" style={{ color: suitColor }}>
              {card.rank}
            </span>
            <span className="text-lg" style={{ color: suitColor }}>
              {suitSymbol}
            </span>
          </div>
        </div>
      ) : (
        // Back of card - Red with white and black borders, "CAMBIO" text
        <div className="w-full h-full rounded-lg shadow-lg border-[3px] border-black overflow-hidden">
          <div className="w-full h-full bg-white p-1 rounded-sm">
            <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-700 rounded-sm flex items-center justify-center relative overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-2 border-2 border-white rounded-sm" />
                <div className="absolute inset-4 border-2 border-white rounded-sm" />
              </div>
              
              {/* CAMBIO text */}
              <div className="relative z-10">
                <div className="text-white font-bold text-xl tracking-wider transform -rotate-45 drop-shadow-lg">
                  CAMBIO
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}