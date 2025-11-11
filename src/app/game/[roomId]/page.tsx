'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'

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
      
      // Fetch initial game state
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
      
      if (roomData && playersData) {
        setGameState({
          room: roomData,
          players: playersData,
          my_player_id: playerId || undefined
        })
      }
      
      setLoading(false)
    }
    
    loadGameData()
    subscribeToRoom(roomId)
    
    return () => unsubscribe()
  }, [roomId])

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
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Players ({players.length}/{room.max_players})</h2>
          <div className="space-y-2">
            {players.map((player, index) => (
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
                    <span className={`px-2 py-1 rounded text-xs ${
                      player.is_connected ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {player.is_connected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game status */}
        <div className="mt-8 text-center text-white">
          <p className="text-lg">Status: <span className="font-bold">{room.status}</span></p>
          <p className="text-sm mt-2">Game functionality coming soon!</p>
        </div>
      </div>
    </div>
  )
}