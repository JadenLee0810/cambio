import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { username, roomCode } = await request.json()
  
  // Find room by code
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single()
  
  if (roomError || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  
  // Check if room is full
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', room.id)
  
  if (existingPlayers && existingPlayers.length >= room.max_players) {
    return NextResponse.json({ error: 'Room is full' }, { status: 400 })
  }
  
  // Add player
  const playerIndex = existingPlayers ? existingPlayers.length : 0
  
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      username,
      player_index: playerIndex,
      hand: [],
      is_ready: false
    })
    .select()
    .single()
  
  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 })
  }
  
  return NextResponse.json({ room, player })
}