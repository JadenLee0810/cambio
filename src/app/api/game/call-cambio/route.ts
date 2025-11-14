import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId, playerId } = await request.json()

  try {
    // Get current room state
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if Cambio has already been called
    if (room.cambio_caller_id) {
      return NextResponse.json({ error: 'Cambio has already been called' }, { status: 400 })
    }

    // Set the Cambio caller - DO NOT change the turn
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({ 
        cambio_caller_id: playerId
      })
      .eq('id', roomId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to call Cambio' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error calling Cambio:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}