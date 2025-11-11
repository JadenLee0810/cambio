import { Card } from '@/types/card'

const suitSymbols = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '🃏'
}

const suitColors = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-black',
  spades: 'text-black',
  joker: 'text-purple-600'
}

export const CardFront = ({ card }: { card: Card }) => {
  return (
    <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
      {/* Top corner */}
      <div className={`text-xl font-bold ${suitColors[card.suit]}`}>
        <div>{card.rank}</div>
        <div>{suitSymbols[card.suit]}</div>
      </div>
      
      {/* Center suit */}
      <div className={`flex-1 flex items-center justify-center text-5xl ${suitColors[card.suit]}`}>
        {suitSymbols[card.suit]}
      </div>
      
      {/* Bottom corner (rotated) */}
      <div className={`text-xl font-bold ${suitColors[card.suit]} text-right rotate-180`}>
        <div>{card.rank}</div>
        <div>{suitSymbols[card.suit]}</div>
      </div>
      
      {/* Power indicator */}
      {card.power && (
        <div className="absolute top-1 right-1 bg-yellow-400 rounded-full w-3 h-3" />
      )}
    </div>
  )
}