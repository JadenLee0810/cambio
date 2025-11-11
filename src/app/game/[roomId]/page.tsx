'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'
import { PlayerHand } from '@/components/game/PlayerHand/PlayerHand'

export default function GamePage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [loading, setLoading] = useState(true)
  
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
      
      // Verify player ID is valid for this room
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
                    <span className={`px-2 py-1 rounded text-xs ${
                      player.is_ready ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      {player.is_ready ? 'Ready' : 'Not Ready'}
                    </span>
                    {isPlaying && room.current_turn === player.player_index && (
                      <span className="px-2 py-1 rounded text-xs bg-yellow-500 text-white">
                        Current Turn
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Controls */}
        {!isPlaying && (
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
        {isPlaying && myPlayer && (
          <div className="mt-8">
            <div className="text-center mb-8">
              <h2 className="text-white text-2xl font-bold">
                {isMyTurn ? "Your Turn!" : `${players[room.current_turn]?.username}'s Turn`}
              </h2>
            </div>

            {/* Your Hand */}
            <div className="fixed bottom-8 left-0 right-0">
              <PlayerHand
                cards={myPlayer.hand}
                isMyTurn={!!isMyTurn}
                onCardClick={(card) => console.log('Card clicked:', card)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}