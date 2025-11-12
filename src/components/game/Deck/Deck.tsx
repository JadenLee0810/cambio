'use client'

interface DeckProps {
  cardCount: number
  onDraw?: () => void
  canDraw?: boolean
}

export const Deck = ({ cardCount, onDraw, canDraw }: DeckProps) => {
  return (
    <div className="relative">
      <div
        onClick={canDraw ? onDraw : undefined}
        className={`w-24 h-36 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-900 shadow-xl flex flex-col items-center justify-center ${
          canDraw ? 'cursor-pointer hover:scale-105 transition-transform' : 'opacity-50'
        }`}
      >
        <div className="text-white text-4xl font-bold opacity-30">C</div>
        <div className="text-white text-sm mt-2">{cardCount} cards</div>
      </div>
    </div>
  )
}