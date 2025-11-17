'use client'

interface DeckProps {
  cardCount: number
  onDraw: () => void
  canDraw: boolean
}

export function Deck({ cardCount, onDraw, canDraw }: DeckProps) {
  return (
    <div className="flex flex-col items-center">
      <div 
        onClick={canDraw ? onDraw : undefined}
        className={`w-32 h-48 ${canDraw ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'} transition-transform`}
      >
        <div className="w-full h-full bg-blue-600 rounded-lg border-4 border-white shadow-lg flex flex-col items-center justify-center">
          <span className="text-white font-bold text-6xl">C</span>
          <span className="text-white text-sm mt-2">{cardCount} cards</span>
        </div>
      </div>
      {canDraw && (
        <p className="text-green-400 text-sm mt-2">Click to draw</p>
      )}
    </div>
  )
}