'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'

export default function WaitingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [loading, setLoading] = useState(true)

  const {
    room,
    players,
    my_player_id,
    subscribeToRoom,
    unsubscribe,
    isConnected
  } = useGameStore()

  useEffect(() => {
    const loadRoomData = async () => {
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
        useGameStore.getState().setGameState({
          room: roomData,
          players: playersData,
          my_player_id: validPlayer ? playerId || undefined : undefined
        })
      }

      setLoading(false)
    }

    loadRoomData()
    subscribeToRoom(roomId)

    return () => unsubscribe()
  }, [roomId])

  useEffect(() => {
    console.log('Room status changed:', room?.status)
    console.log('Game phase:', room?.game_phase)

    if (room?.status === 'playing') {
      console.log('Redirecting to game page...')
      router.push(`/game/${roomId}`)
    }
  }, [room?.status, room?.game_phase, roomId, router])

  const handleReady = async () => {
    const myPlayer = players.find(p => p.id === my_player_id)
    const newReadyState = !myPlayer?.is_ready

    // Save ready state to database
    const supabase = createClient()
    await supabase
      .from('players')
      .update({ is_ready: newReadyState })
      .eq('id', my_player_id)
  }

  const handleStartGame = async () => {
    console.log('=== START GAME CLICKED ===')
    console.log('allReady:', allReady)
    console.log('isHost:', isHost)
    console.log('roomId:', roomId)

    if (!allReady) {
      console.log('Not all ready - blocking')
      alert('All players must be ready!')
      return
    }

    console.log('Starting game for room:', roomId)

    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        console.error('API Error:', data)
        alert('Failed to start game: ' + (data.error || 'Unknown error'))
        return
      }

      console.log('Game started successfully!')
      console.log('Current room status:', room?.status)
      console.log('Current game phase:', room?.game_phase)
    } catch (error) {
      console.error('Exception:', error)
      alert('Failed to start game: ' + error)
    }
  }

  const handleLeaveRoom = async () => {
    const supabase = createClient()

    if (my_player_id) {
      await supabase
        .from('players')
        .delete()
        .eq('id', my_player_id)
    }

    localStorage.removeItem('playerId')
    router.push('/lobby')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Room not found</div>
      </div>
    )
  }

  const myPlayer = players.find(p => p.id === my_player_id)
  const hostPlayer = players.find(p => p.id === room.creator_id)
  const isHost = room.creator_id === my_player_id
  const allReady = players.every(p => p.is_ready) && players.length >= 2

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 rounded-lg shadow-lg p-8 mb-8 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-serif font-bold text-white">
              {hostPlayer?.username}'s Room
            </h1>
            <div className="text-right">
              <span className="text-slate-400 text-sm block">Room Code</span>
              <span className="text-2xl font-mono font-bold text-white">
                {room.room_code}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg p-8 border border-slate-700">
          {/* Players header with Ready button on the right */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              Players ({players.length}/8)
            </h2>
            <button
              onClick={handleReady}
              className={`px-6 py-2 rounded font-bold transition-colors ${myPlayer?.is_ready
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
            >
              {myPlayer?.is_ready ? '✓ Ready' : 'Not Ready'}
            </button>
          </div>

          <div className="space-y-4 mb-8">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-slate-700 rounded-lg p-4 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${player.id === my_player_id ? 'text-yellow-400' : 'text-white'
                    }`}>
                    {player.username}
                  </span>
                  {room.creator_id && player.id === room.creator_id && (
                    <span className="text-white text-lg font-bold">
                      (Host)
                    </span>

                  )}
                </div>

                {player.is_ready ? (
                  <span className="text-green-400 font-bold">✓ Ready</span>
                ) : (
                  <span className="text-red-400 font-bold">Not Ready</span>
                )}
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={!allReady}
              className={`w-full py-4 rounded-lg font-bold text-xl transition-colors ${allReady
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
            >
              {allReady ? 'Start Game' : 'Waiting for all players to be ready...'}
            </button>
          ) : (
            <div className="text-center text-slate-400 text-lg py-4">
              Waiting for the host to start the game...
            </div>
          )}

          <button
            onClick={handleLeaveRoom}
            className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            ← Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}