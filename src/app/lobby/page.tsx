'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

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
        router.push(`/waiting/${data.room.id}`)
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
        router.push(`/waiting/${data.room.id}`)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-slate-800 rounded-3xl shadow-2xl p-10 max-w-md w-full border border-slate-700"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-white mb-2">Cambio</h1>
          <p className="text-slate-400">Join or create a game</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
            onKeyPress={(e) => e.key === 'Enter' && createRoom()}
          />
          
          <button
            onClick={createRoom}
            disabled={!username || isCreating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
          >
            {isCreating ? 'Creating...' : 'Create New Room'}
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-500">OR</span>
            </div>
          </div>
          
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400 font-mono"
            maxLength={6}
            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
          />
          
          <button
            onClick={joinRoom}
            disabled={!username || !roomCode || isJoining}
            className="w-full bg-slate-700 text-white py-3 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all border border-slate-600"
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>

        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="w-full mt-6 text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← Back to Home
        </button>
      </motion.div>
    </div>
  )
}