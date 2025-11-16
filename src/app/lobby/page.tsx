'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LobbyPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [showJoinInput, setShowJoinInput] = useState(false)

  const handleCreateRoom = async () => {
    if (!username.trim()) {
      alert('Please enter a username')
      return
    }

    const supabase = createClient()

    // Generate 6-character room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: room } = await supabase
      .from('game_rooms')
      .insert({
        room_code: code,
        status: 'waiting'
      })
      .select()
      .single()

    if (!room) {
      alert('Failed to create room')
      return
    }

    const { data: player } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        username: username.trim(),
        player_index: 0,
        hand: [],
        score: 0
      })
      .select()
      .single()

    if (!player) {
      alert('Failed to join room')
      return
    }

    await supabase
      .from('game_rooms')
      .update({ creator_id: player.id })
      .eq('id', room.id)

    localStorage.setItem('playerId', player.id)
    router.push(`/waiting/${room.id}`)
  }

  const handleJoinRoom = async () => {
    if (!username.trim() || !roomCode.trim()) {
      alert('Please enter username and room code')
      return
    }

    const supabase = createClient()

    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single()

    if (!room) {
      alert('Room not found')
      return
    }

    if (room.status !== 'waiting') {
      alert('Game already in progress')
      return
    }

    const { data: existingPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)

    const playerIndex = existingPlayers?.length || 0

    const { data: player } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        username: username.trim(),
        player_index: playerIndex,
        hand: [],
        score: 0
      })
      .select()
      .single()

    if (!player) {
      alert('Failed to join room')
      return
    }

    localStorage.setItem('playerId', player.id)
    router.push(`/waiting/${room.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <h1 className="text-4xl font-serif font-bold text-white text-center mb-2">
          Cambio
        </h1>
        <p className="text-slate-400 text-center mb-8">Version 1.3</p>

        <div className="space-y-4">
          {/* Username Input */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Create and Join buttons side by side */}
          {!showJoinInput ? (
            <div className="flex gap-3">
              <button
                onClick={handleCreateRoom}
                disabled={!username.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                Create Room
              </button>
              <button
                onClick={() => setShowJoinInput(true)}
                disabled={!username.trim()}
                className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                Join Room
              </button>
            </div>
          ) : (
            /* Join Room Input */
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim()}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                >
                  Join
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false)
                    setRoomCode('')
                  }}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Back to Home */}
          <button
            onClick={() => router.push('/')}
            className="w-full py-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}