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
        <p className="text-slate-400 text-center mb-8">Version 1.6</p>

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

import { Card } from '@/types/card'

interface PlayerHandProps {
  cards: Card[]
  isMyTurn: boolean
  onCardClick: (card: Card, e?: React.MouseEvent) => void
  highlightedCardId?: string | null
  recentlyChangedCardId?: string | null
}

export function PlayerHand({ 
  cards, 
  isMyTurn, 
  onCardClick,
  highlightedCardId,
  recentlyChangedCardId
}: PlayerHandProps) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-white font-bold mb-2">Your Hand</p>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((card: any, index: number) => {
          if (!card) {
            return (
              <div 
                key={index} 
                className="w-32 h-48 border-2 border-dashed border-slate-600 rounded-lg bg-slate-800/30"
              />
            )
          }

          const isHighlighted = highlightedCardId === card.id
          const isRecentlyChanged = recentlyChangedCardId === card.id

          return (
            <div 
              key={card.id} 
              onClick={(e) => onCardClick(card, e)}
              className={`w-32 h-48 transition-all duration-300 cursor-pointer hover:scale-105 ${
                isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : ''
              } ${
                isRecentlyChanged ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''
              }`}
              title="Click to use | Shift+Click to race discard"
            >
              {card.isFaceUp ? (
                <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                  <div className="text-xl font-bold" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                    <div>{card.rank}</div>
                    <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center text-4xl" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                    {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-red-600 rounded-lg border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl transform -rotate-45">CAMBIO</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}