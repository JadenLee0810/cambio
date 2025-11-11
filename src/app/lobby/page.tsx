'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Lobby() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  const createRoom = async () => {
    if (!username) {
      setError('Please enter a username')
      return
    }
    
    setError('')
    setIsCreating(true)
    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      
      const data = await response.json()
      if (data.room) {
        localStorage.setItem('playerId', data.player.id)
        router.push(`/game/${data.room.id}`)
      } else {
        setError(data.error || 'Failed to create room')
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      setError('Failed to create room')
    }
    setIsCreating(false)
  }

  const joinRoom = async () => {
    if (!username) {
      setError('Please enter a username')
      return
    }
    if (!roomCode) {
      setError('Please enter a room code')
      return
    }
    
    setError('')
    setIsJoining(true)
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, roomCode: roomCode.toUpperCase() })
      })
      
      const data = await response.json()
      if (data.room) {
        localStorage.setItem('playerId', data.player.id)
        router.push(`/game/${data.room.id}`)
      } else {
        setError(data.error || 'Failed to join room')
      }
    } catch (error) {
      console.error('Failed to join room:', error)
      setError('Failed to join room')
    }
    setIsJoining(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Cambio Card Game</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            onKeyPress={(e) => e.key === 'Enter' && createRoom()}
          />
          
          <button
            onClick={createRoom}
            disabled={!username || isCreating}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create New Room'}
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>
          
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            maxLength={6}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
          />
          
          <button
            onClick={joinRoom}
            disabled={!username || !roomCode || isJoining}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  )
}