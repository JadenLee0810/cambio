'use client'

export default function GamePage({ params }: { params: { roomId: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-600 p-4">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-4">Game Room</h1>
        <p>Room ID: {params.roomId}</p>
        <p className="mt-4">Game functionality coming soon!</p>
      </div>
    </div>
  )
}