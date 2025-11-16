import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json()
    const supabase = await createClient()

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

    if (!players || players.length === 0) {
      return NextResponse.json({ error: 'No players found' }, { status: 404 })
    }

    // Move to next player
    const nextTurn = (room.current_turn + 1) % players.length

    await supabase
      .from('game_rooms')
      .update({ 
        current_turn: nextTurn,
        race_discard_used_this_turn: false  // Reset race discard flag
      })
      .eq('id', roomId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing turn:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}