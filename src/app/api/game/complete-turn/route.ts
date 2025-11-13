import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId } = await request.json()
  
  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('player_index')
  
  if (!players) {
    return NextResponse.json({ error: 'Players not found' }, { status: 404 })
  }
  
  // Advance turn
  const nextTurn = (room.current_turn + 1) % players.length
  
  await supabase
    .from('game_rooms')
    .update({ current_turn: nextTurn })
    .eq('id', roomId)
  
  // Check if we've come back to the Cambio caller
  if (room.cambio_caller_id !== null && room.cambio_caller_id !== undefined) {
    const cambioCallerIndex = players.findIndex(p => p.id === room.cambio_caller_id)
    
    if (nextTurn === cambioCallerIndex) {
      // Game ends! Calculate scores
      const playersWithScores = players.map(player => {
        const score = player.hand.reduce((sum: number, card: any) => {
          if (!card) return sum // Skip empty slots
          
          // Card values
          const rankValues: { [key: string]: number } = {
            'K': 0,  // Red Kings are 0
            'Q': 10,
            'J': 10,
            'A': 1,
            '2': 2,
            '3': 3,
            '4': 4,
            '5': 5,
            '6': 6,
            '7': 7,
            '8': 8,
            '9': 9,
            '10': 10
          }
          
          let value = rankValues[card.rank] || 0
          
          // Black Kings are worth 10
          if (card.rank === 'K' && (card.suit === 'spades' || card.suit === 'clubs')) {
            value = 10
          }
          
          return sum + value
        }, 0)
        
        return {
          ...player,
          score
        }
      })
      
      // Update all player scores
      for (const player of playersWithScores) {
        await supabase
          .from('players')
          .update({ score: player.score })
          .eq('id', player.id)
      }
      
      // Check if Cambio caller has lowest score
      const cambioPlayer = playersWithScores.find(p => p.id === room.cambio_caller_id)
      const hasLowestScore = playersWithScores.every(p => 
        p.id === room.cambio_caller_id || cambioPlayer!.score <= p.score
      )
      
      // If Cambio caller doesn't have lowest score, they get 10 point penalty
      if (!hasLowestScore && cambioPlayer) {
        await supabase
          .from('players')
          .update({ score: cambioPlayer.score + 10 })
          .eq('id', cambioPlayer.id)
      }
      
      // End game
      await supabase
        .from('game_rooms')
        .update({ status: 'finished' })
        .eq('id', roomId)
    }
  }
  
  return NextResponse.json({ success: true })
}