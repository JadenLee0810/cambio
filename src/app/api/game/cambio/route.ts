import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { roomId, playerId } = await request.json()
    
    // Get all players
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
    
    if (!players) {
      return NextResponse.json({ error: 'Players not found' }, { status: 404 })
    }
    
    // Calculate scores
    const scores = players.map(player => {
      const score = player.hand.reduce((sum: number, card: any) => sum + card.value, 0)
      return { ...player, score }
    })
    
    // Find winner (lowest score)
    const winner = scores.reduce((lowest, current) => 
      current.score < lowest.score ? current : lowest
    )
    
    // Update all player scores
    for (const player of scores) {
      await supabase
        .from('players')
        .update({ 
          score: player.score,
          hand: player.hand.map((card: any) => ({ ...card, isFaceUp: true }))
        })
        .eq('id', player.id)
    }
    
    // Update room to finished
    await supabase
      .from('game_rooms')
      .update({
        status: 'finished',
        game_phase: 'ended',
        finished_at: new Date().toISOString()
      })
      .eq('id', roomId)
    
    return NextResponse.json({ 
      success: true, 
      winner: winner.username,
      scores: scores.map(s => ({ username: s.username, score: s.score }))
    })
  } catch (error) {
    console.error('Cambio error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}