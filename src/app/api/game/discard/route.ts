import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { roomId, playerId, cardId } = await request.json()
    
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
    
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_index')
    
    if (!room || !player || !allPlayers) {
      return NextResponse.json({ error: 'Room or player not found' }, { status: 404 })
    }
    
    // Check if it's player's turn
    if (room.current_turn !== player.player_index) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
    }
    
    // Find card in player's hand
    const cardIndex = player.hand.findIndex((c: any) => c.id === cardId)
    if (cardIndex === -1) {
      return NextResponse.json({ error: 'Card not in hand' }, { status: 400 })
    }
    
    const discardedCard = player.hand[cardIndex]
    const newHand = player.hand.filter((c: any) => c.id !== cardId)
    
    // Update player hand
    await supabase
      .from('players')
      .update({ hand: newHand })
      .eq('id', playerId)
    
    // Add to discard pile
    const newDiscardPile = [...room.discard_pile, discardedCard]
    
    // Advance turn
    const nextTurn = (room.current_turn + 1) % allPlayers.length
    
    // Update room
    await supabase
      .from('game_rooms')
      .update({
        discard_pile: newDiscardPile,
        current_turn: nextTurn
      })
      .eq('id', roomId)
    
    // Log action
    await supabase.from('game_actions').insert({
      room_id: roomId,
      player_id: playerId,
      action_type: 'discard',
      action_data: { cardId },
      result: 'success'
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Discard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}