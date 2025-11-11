'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'
import { PlayerHand } from '@/components/game/PlayerHand/PlayerHand'
import { Deck } from '@/components/game/Deck/Deck'
import { DiscardPile } from '@/components/game/Deck/DiscardPile'
import { Card as CardType } from '@/types/card'

export default function GamePage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [loading, setLoading] = useState(true)
  const [drawnCard, setDrawnCard] = useState<CardType | null>(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  
  const {
    room,
    players,
    my_player_id,
    subscribeToRoom,
    unsubscribe,
    isConnected,
    setGameState
  } = useGameStore()

  useEffect(() => {
    const loadGameData = async () => {
      const supabase = createClient()
      const playerId = localStorage.getItem('playerId')
      
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
      
      const validPlayer = playersData?.find(p => p.id === playerId)
      
      if (roomData && playersData) {
        setGameState({
          room: roomData,
          players: playersData,
          my_player_id: validPlayer ? playerId || undefined : undefined
        })
      }
      
      setLoading(false)
    }
    
    loadGameData()
    subscribeToRoom(roomId)
    
    return () => unsubscribe()
  }, [roomId])

  const toggleReady = async () => {
    if (!my_player_id) return
    
    const myPlayer = players.find(p => p.id === my_player_id)
    if (!myPlayer) return
    
    await fetch('/api/game/ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: my_player_id,
        isReady: !myPlayer.is_ready
      })
    })
  }

  const startGame = async () => {
    await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    })
  }

  const drawCard = async (source: 'deck' | 'discard') => {
    const response = await fetch('/api/game/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        source
      })
    })
    
    const data = await response.json()
    if (data.success) {
      setDrawnCard(data.card)
    }
  }

  const discardCard = async () => {
    if (!drawnCard) return
    
    await fetch('/api/game/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId: drawnCard.id,
        replaceCardIndex: selectedCardIndex
      })
    })
    
    setDrawnCard(null)
    setSelectedCardIndex(null)
  }

  const peekCard = async (cardIndex: number) => {
    await fetch('/api/game/peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: my_player_id,
        cardIndex
      })
    })
  }

  const callCambio = async () => {
    const response = await fetch('/api/game/cambio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id
      })
    })
    
    const data = await response.json()
    if (data.success) {
      alert(`Game Over! Winner: ${data.winner}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex items-center justify-center">
        <div className="text-white text-2xl">Game not found</div>
      </div>
    )
  }

  const myPlayer = players.find(p => p.id === my_player_id)
  const allReady = players.length >= 2 && players.every(p => p.is_ready)
  const isPlaying = room.status === 'playing'
  const isFinished = room.status === 'finished'
  const isMyTurn = myPlayer && room.current_turn === myPlayer.player_index

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Cambio Game</h1>
              <p className="text-gray-600">Room Code: <span className="font-mono font-bold">{room.room_code}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Players ({players.length}/{room.max_players})</h2>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg ${
                  player.id === my_player_id ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    {player.username} {player.id === my_player_id && '(You)'}
                  </span>
                  <div className="flex gap-2">
                    {!isPlaying && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        player.is_ready ? 'bg-green-500 text-white' : 'bg-gray-300'
                      }`}>
                        {player.is_ready ? 'Ready' : 'Not Ready'}
                      </span>
                    )}
                    {isPlaying && room.current_turn === player.player_index && (
                      <span className="px-2 py-1 rounded text-xs bg-yellow-500 text-white">
                        Current Turn
                      </span>
                    )}
                    {isFinished && (
                      <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white">
                        Score: {player.score}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Controls - Waiting Room */}
        {!isPlaying && !isFinished && (
          <div className="text-center space-y-4">
            <button
              onClick={toggleReady}
              className={`px-8 py-3 rounded-lg font-bold text-white ${
                myPlayer?.is_ready 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {myPlayer?.is_ready ? 'Not Ready' : 'Ready'}
            </button>

            {allReady && (
              <div>
                <button
                  onClick={startGame}
                  className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Start Game
                </button>
                <p className="text-white text-sm mt-2">All players ready! Click to start.</p>
              </div>
            )}

            {!allReady && players.length >= 2 && (
              <p className="text-white">Waiting for all players to be ready...</p>
            )}

            {players.length < 2 && (
              <p className="text-white">Waiting for more players to join...</p>
            )}
          </div>
        )}

        {/* Game Board - Active Game */}
        {isPlaying && myPlayer && (
          <div className="space-y-8">
            {/* Turn Indicator */}
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold">
                {isMyTurn ? "Your Turn!" : `${players[room.current_turn]?.username}'s Turn`}
              </h2>
            </div>

            {/* Center Area: Deck and Discard */}
            <div className="flex justify-center gap-12">
              <Deck
                cardCount={room.deck?.length || 0}
                onDraw={() => drawCard('deck')}
                canDraw={!!isMyTurn && !drawnCard}
              />
              <DiscardPile
                cards={room.discard_pile || []}
                onDraw={() => drawCard('discard')}
                canDraw={!!isMyTurn && !drawnCard}
              />
            </div>

            {/* Drawn Card Display */}
            {drawnCard && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4 text-center">You drew a card! Choose an action:</h3>
                <div className="flex justify-center gap-8 items-center">
                  <div className="text-center">
                    <div className="mb-2">Drawn Card:</div>
                    <div className="w-24 h-36">
                      <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                        <div className="text-xl font-bold text-red-600">
                          <div>{drawnCard.rank}</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center text-4xl">
                          {drawnCard.suit === 'hearts' && '♥'}
                          {drawnCard.suit === 'diamonds' && '♦'}
                          {drawnCard.suit === 'clubs' && '♣'}
                          {drawnCard.suit === 'spades' && '♠'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={discardCard}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 w-full"
                    >
                      Discard (End Turn)
                    </button>
                    <button
                      onClick={() => {
                        if (selectedCardIndex !== null) {
                          discardCard()
                        } else {
                          alert('Click one of your cards to replace it')
                        }
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full"
                    >
                      Replace a Card
                    </button>
                    {selectedCardIndex !== null && (
                      <p className="text-sm text-gray-600">
                        Will replace card {selectedCardIndex + 1}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isMyTurn && !drawnCard && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={callCambio}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold"
                >
                  Call CAMBIO!
                </button>
              </div>
            )}

            {/* Your Hand */}
            <div className="fixed bottom-8 left-0 right-0">
              <div className="text-center mb-4">
                <h3 className="text-white font-bold">Your Cards</h3>
                <p className="text-white text-sm">
                  {drawnCard ? 'Click a card to replace it' : 'Click to peek at your cards'}
                </p>
              </div>
              <PlayerHand
                cards={myPlayer.hand}
                isMyTurn={!!isMyTurn}
                onCardClick={(card) => {
                  if (drawnCard) {
                    setSelectedCardIndex(card.position)
                  } else {
                    peekCard(card.position)
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Game Over */}
        {isFinished && (
          <div className="text-center space-y-4">
            <h2 className="text-white text-3xl font-bold">Game Over!</h2>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Final Scores</h3>
              <div className="space-y-2">
                {players
                  .sort((a, b) => a.score - b.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-100 border-2 border-yellow-500' : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          {index === 0 && '👑 '}
                          {player.username}
                          {player.id === my_player_id && ' (You)'}
                        </span>
                        <span className="font-bold">{player.score} points</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/lobby'}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
            >
              Back to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  )
}