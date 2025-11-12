import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { roomId, playerId, source } = await request.json() // source: 'deck' or 'discard'
    
    // Get current game state
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()
    
    if (!room || !player) {
      return NextResponse.json({ error: 'Room or player not found' }, { status: 404 })
    }
    
    // Check if it's player's turn
    if (room.current_turn !== player.player_index) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
    }
    
    let drawnCard
    let newDeck = room.deck
    let newDiscardPile = room.discard_pile
    
    if (source === 'deck') {
      if (room.deck.length === 0) {
        return NextResponse.json({ error: 'Deck is empty' }, { status: 400 })
      }
      drawnCard = room.deck[room.deck.length - 1]
      newDeck = room.deck.slice(0, -1)
    } else if (source === 'discard') {
      if (room.discard_pile.length === 0) {
        return NextResponse.json({ error: 'Discard pile is empty' }, { status: 400 })
      }
      drawnCard = room.discard_pile[room.discard_pile.length - 1]
      newDiscardPile = room.discard_pile.slice(0, -1)
    }
    
    // Update room
    await supabase
      .from('game_rooms')
      .update({
        deck: newDeck,
        discard_pile: newDiscardPile
      })
      .eq('id', roomId)
    
    // Log action
    await supabase.from('game_actions').insert({
      room_id: roomId,
      player_id: playerId,
      action_type: source === 'deck' ? 'draw_from_deck' : 'draw_from_discard',
      action_data: { cardId: drawnCard.id },
      result: 'success'
    })
    
    return NextResponse.json({ success: true, card: drawnCard })
  } catch (error) {
    console.error('Draw error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}