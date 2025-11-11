import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDeck, shuffleDeck } from '@/lib/game-logic/deck'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { username, maxPlayers = 8 } = await request.json()
  
  // Generate unique room code
  const roomCode = generateRoomCode()
  
  // Create shuffled deck
  const deck = shuffleDeck(createDeck())
  
  // Create room
  const { data: room, error: roomError } = await supabase
    .from('game_rooms')
    .insert({
      room_code: roomCode,
      status: 'waiting',
      max_players: maxPlayers,
      deck,
      discard_pile: [],
      settings: {
        cards_per_player: 4,
        allow_card_powers: true,
        reaction_window_ms: 2000,
        cambio_penalty: 10
      }
    })
    .select()
    .single()
  
  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 })
  }
  
  // Add creator as first player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      username,
      player_index: 0,
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

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}