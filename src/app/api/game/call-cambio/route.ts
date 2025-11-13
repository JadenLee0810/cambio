import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId, playerId } = await request.json()
  
  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  
  // Check if Cambio has already been called
  if (room.cambio_caller_id !== null && room.cambio_caller_id !== undefined) {
    return NextResponse.json({ error: 'Cambio has already been called!' }, { status: 400 })
  }
  
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('player_index')
  
  if (!players) {
    return NextResponse.json({ error: 'Players not found' }, { status: 404 })
  }
  
  // Set cambio caller
  await supabase
    .from('game_rooms')
    .update({ 
      cambio_caller_id: playerId,
      cambio_round: room.round_number
    })
    .eq('id', roomId)
  
  // Advance to next player's turn
  const nextTurn = (room.current_turn + 1) % players.length
  
  await supabase
    .from('game_rooms')
    .update({ 
      current_turn: nextTurn
    })
    .eq('id', roomId)
  
  return NextResponse.json({ success: true })
}