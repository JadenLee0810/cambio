'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'

export default function WaitingRoom() {
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

  // Redirect to game when it starts
  useEffect(() => {
    if (room && room.status === 'playing') {
      router.push(`/game/${roomId}`)
    }
  }, [room?.status, roomId, router])

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
  const allReady = players.length >= 2 && players.every(p => p.is_ready)
  const isCreator = room.creator_id === my_player_id

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-lg shadow-lg p-6 mb-8 border border-slate-700"
        >
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Waiting Room</h1>
            <div className="flex items-center justify-center gap-3 mb-4">
              <p className="text-slate-400">Room Code:</p>
              <span className="font-mono font-bold text-3xl text-white bg-slate-700 px-4 py-2 rounded border border-slate-600">
                {room.room_code}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-slate-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </motion.div>

        {/* Players List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800 rounded-lg shadow-lg p-6 mb-8 border border-slate-700"
        >
          <h2 className="text-xl font-bold mb-4 text-white">
            Players ({players.length}/{room.max_players})
          </h2>
          <div className="space-y-2">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className={`p-4 rounded-lg ${
                  player.id === my_player_id 
                    ? 'bg-blue-900/30 border border-blue-700' 
                    : 'bg-slate-700 border border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {player.username}
                    </span>
                    {player.id === my_player_id && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">You</span>
                    )}
                    {player.id === room.creator_id && (
                      <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">Host</span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    player.is_ready 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-600 text-slate-300'
                  }`}>
                    {player.is_ready ? '✓ Ready' : 'Not Ready'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-4"
        >
          {/* Ready button for all players */}
          <button
            onClick={toggleReady}
            className={`px-8 py-3 rounded-lg font-bold text-white w-full ${
              myPlayer?.is_ready 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            } transition-colors`}
          >
            {myPlayer?.is_ready ? 'Not Ready' : 'Ready Up'}
          </button>

          {/* Start game button - only for creator */}
          {isCreator ? (
            <>
              {allReady ? (
                <button
                  onClick={startGame}
                  className="px-8 py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 w-full transition-colors"
                >
                  Start Game
                </button>
              ) : (
                <div className="text-slate-400 text-sm">
                  {players.length < 2 
                    ? 'Waiting for more players...' 
                    : 'Waiting for all players to be ready...'}
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-400 text-sm">
              Waiting for host to start the game...
            </div>
          )}
        </motion.div>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => router.push('/lobby')}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            ← Leave Room
          </button>
        </motion.div>
      </div>
    </div>
  )
}