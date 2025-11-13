import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId, playerId } = await request.json()
  
  // Mark player as peeked
  await supabase
    .from('players')
    .update({ has_peeked: true })
    .eq('id', playerId)
  
  // Check if all players have peeked
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
  
  const allPeeked = players?.every(p => p.has_peeked)
  
  if (allPeeked) {
    // Hide all cards and start actual game
    for (const player of players!) {
      const hiddenHand = player.hand.map((c: any) => ({ ...c, isFaceUp: false }))
      await supabase
        .from('players')
        .update({ hand: hiddenHand })
        .eq('id', player.id)
    }
    
    // Update game phase to playing
    await supabase
      .from('game_rooms')
      .update({ game_phase: 'playing' })
      .eq('id', roomId)
  }
  
  return NextResponse.json({ success: true, allPeeked })
}