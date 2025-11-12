'use client'

import { useState } from 'react'

interface GameControlsProps {
  isMyTurn: boolean
  drawnCard: any | null
  onDrawDeck: () => void
  onDrawDiscard: () => void
  onDiscard: (cardId: string) => void
  onSwap: (handCardId: string) => void
  onPeek: (cardId: string) => void
  onCallCambio: () => void
  canDrawDeck: boolean
  canDrawDiscard: boolean
}

export const GameControls = ({
  isMyTurn,
  drawnCard,
  onDrawDeck,
  onDrawDiscard,
  onDiscard,
  onSwap,
  onPeek,
  onCallCambio,
  canDrawDeck,
  canDrawDiscard
}: GameControlsProps) => {
  const [selectedHandCard, setSelectedHandCard] = useState<string | null>(null)
  const [mode, setMode] = useState<'draw' | 'discard' | 'swap' | 'peek'>('draw')
  
  if (!isMyTurn) {
    return (
      <div className="fixed top-24 right-8 bg-white rounded-lg shadow-lg p-4">
        <p className="text-gray-600">Waiting for your turn...</p>
      </div>
    )
  }
  
  return (
    <div className="fixed top-24 right-8 bg-white rounded-lg shadow-lg p-4 space-y-3 min-w-[200px]">
      <h3 className="font-bold text-lg">Your Turn</h3>
      
      {!drawnCard && mode === 'draw' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Draw a card:</p>
          <button
            onClick={onDrawDeck}
            disabled={!canDrawDeck}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Draw from Deck
          </button>
          <button
            onClick={onDrawDiscard}
            disabled={!canDrawDiscard}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Draw from Discard
          </button>
          <div className="border-t pt-2">
            <button
              onClick={() => setMode('peek')}
              className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
            >
              Peek at Card
            </button>
          </div>
        </div>
      )}
      
      {drawnCard && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">You drew a card!</p>
          <button
            onClick={() => onDiscard(drawnCard.id)}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
          >
            Discard Drawn Card
          </button>
          <p className="text-xs text-gray-500 text-center">OR</p>
          <button
            onClick={() => setMode('swap')}
            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700"
          >
            Swap with Hand
          </button>
          {mode === 'swap' && (
            <p className="text-xs text-gray-600">Click a card in your hand to swap</p>
          )}
        </div>
      )}
      
      {mode === 'peek' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Click a card to peek at it</p>
          <button
            onClick={() => setMode('draw')}
            className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
      
      <div className="border-t pt-2">
        <button
          onClick={onCallCambio}
          className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 font-bold"
        >
          Call Cambio!
          </button>
      </div>
    </div>
  )
}