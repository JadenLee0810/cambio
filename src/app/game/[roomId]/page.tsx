'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'
import { PlayerHand } from '@/components/game/PlayerHand/PlayerHand'
import { Deck } from '@/components/game/Deck/Deck'
import { DiscardPile } from '@/components/game/Deck/DiscardPile'
import { GameControls } from '@/components/game/GameControls/GameControls'
import { Card as CardType } from '@/types/card'

export default function GamePage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [loading, setLoading] = useState(true)
  const [drawnCard, setDrawnCard] = useState<CardType | null>(null)
  const [gameMode, setGameMode] = useState<'draw' | 'discard' | 'swap' | 'peek'>('draw')
  
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

  const handleDrawDeck = async () => {
    const response = await fetch('/api/game/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        source: 'deck'
      })
    })
    
    const data = await response.json()
    if (data.success) {
      setDrawnCard(data.card)
      setGameMode('discard')
    }
  }

  const handleDrawDiscard = async () => {
    const response = await fetch('/api/game/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        source: 'discard'
      })
    })
    
    const data = await response.json()
    if (data.success) {
      setDrawnCard(data.card)
      setGameMode('discard')
    }
  }

  const handleDiscard = async (cardId: string) => {
    const response = await fetch('/api/game/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId
      })
    })
    
    if (response.ok) {
      setDrawnCard(null)
      setGameMode('draw')
    }
  }

  const handleSwap = async (handCardId: string) => {
    if (!drawnCard) return
    
    const myPlayer = players.find(p => p.id === my_player_id)
    if (!myPlayer) return
    
    // Find the card being swapped out
    const cardToRemove = myPlayer.hand.find((c: any) => c.id === handCardId)
    if (!cardToRemove) return
    
    // Update hand locally first for immediate feedback
    const newHand = myPlayer.hand.map((c: any) => {
      if (c.id === handCardId) {
        return {
          ...drawnCard,
          isFaceUp: false,
          position: c.position
        }
      }
      return c
    })
    
    // Update in database
    const supabase = createClient()
    await supabase
      .from('players')
      .update({ hand: newHand })
      .eq('id', my_player_id)
    
    // Discard the removed card
    await handleDiscard(cardToRemove.id)
    
    setDrawnCard(null)
    setGameMode('draw')
  }

  const handlePeek = async (cardId: string) => {
    await fetch('/api/game/peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: my_player_id,
        cardId
      })
    })
    
    setGameMode('draw')
  }

  const handleCardClick = (card: any) => {
    if (!isMyTurn) return
    
    if (gameMode === 'swap' && drawnCard) {
      handleSwap(card.id)
    } else if (gameMode === 'peek') {
      handlePeek(card.id)
    }
  }

  const handleCallCambio = async () => {
    // End the game
    const supabase = createClient()
    
    // Calculate scores for all players
    const playersWithScores = players.map(p => ({
      ...p,
      score: p.hand.reduce((sum: number, card: any) => sum + card.value, 0)
    }))
    
    // Find winner (lowest score)
    const winner = playersWithScores.reduce((lowest, current) => 
      current.score < lowest.score ? current : lowest
    )
    
    // Update room to finished
    await supabase
      .from('game_rooms')
      .update({
        status: 'finished',
        game_phase: 'ended',
        finished_at: new Date().toISOString()
      })
      .eq('id', roomId)
    
    // Reveal all cards
    for (const player of players) {
      const revealedHand = player.hand.map((c: any) => ({ ...c, isFaceUp: true }))
      await supabase
        .from('players')
        .update({ 
          hand: revealedHand,
          score: playersWithScores.find(p => p.id === player.id)?.score || 0
        })
        .eq('id', player.id)
    }
    
    alert(`Game Over! Winner: ${winner.username} with ${winner.score} points!`)
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
  const isMyTurn = myPlayer && room.current_turn === myPlayer.player_index
  const isGameOver = room.status === 'finished'

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
                    {isGameOver && (
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

        {/* Game Controls - Lobby */}
        {!isPlaying && !isGameOver && (
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

        {/* Game Board - Only show when playing */}
        {isPlaying && myPlayer && !isGameOver && (
          <div className="mt-8">
            {/* Turn Indicator */}
            <div className="text-center mb-8">
              <h2 className="text-white text-2xl font-bold">
                {isMyTurn ? "Your Turn!" : `${players[room.current_turn]?.username}'s Turn`}
              </h2>
            </div>

            {/* Center Area - Deck and Discard */}
            <div className="flex justify-center gap-8 mb-16">
              <Deck 
                cardCount={room.deck.length}
                onDraw={handleDrawDeck}
                canDraw={isMyTurn && !drawnCard && gameMode === 'draw'}
              />
              <DiscardPile 
                cards={room.discard_pile}
                onDraw={handleDrawDiscard}
                canDraw={isMyTurn && !drawnCard && gameMode === 'draw' && room.discard_pile.length > 0}
              />
            </div>

            {/* Game Controls Sidebar */}
            {isMyTurn && (
              <GameControls
                isMyTurn={!!isMyTurn}
                drawnCard={drawnCard}
                onDrawDeck={handleDrawDeck}
                onDrawDiscard={handleDrawDiscard}
                onDiscard={handleDiscard}
                onSwap={handleSwap}
                onPeek={handlePeek}
                onCallCambio={handleCallCambio}
                canDrawDeck={room.deck.length > 0}
                canDrawDiscard={room.discard_pile.length > 0}
              />
            )}

            {/* Your Hand */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
              <PlayerHand
                cards={myPlayer.hand}
                isMyTurn={!!isMyTurn}
                onCardClick={handleCardClick}
              />
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="text-center space-y-6">
            <h2 className="text-white text-4xl font-bold">Game Over!</h2>
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold mb-4">Final Scores</h3>
              <div className="space-y-3">
                {[...players]
                  .sort((a, b) => a.score - b.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-4 rounded-lg ${
                        index === 0 ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">
                          {index === 0 && '👑 '}
                          {player.username}
                          {player.id === my_player_id && ' (You)'}
                        </span>
                        <span className="text-2xl font-bold">{player.score} pts</span>
                      </div>
                    </div>
                  ))}
              </div>
              <button
                onClick={() => window.location.href = '/lobby'}
                className="mt-6 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}