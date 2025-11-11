import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { roomId, playerId, cardId, replaceCardIndex } = await request.json()

    // Get current game state
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    const { data: playersRaw } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_index', { ascending: true })

    // Guard: players may be null or empty
    if (!room || !playersRaw || playersRaw.length === 0) {
      return NextResponse.json({ error: 'Room or players not found' }, { status: 404 })
    }

    const players = playersRaw // now narrowed to a non-empty array

    const player = players.find(p => p.id === playerId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Check if it's player's turn
    if (room.current_turn !== player.player_index) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 })
    }

    // Find card being discarded (temporary card from draw)
    const cardToDiscard = { id: cardId } // This would be the drawn card

    // Add to discard pile (ensure array)
    const updatedDiscardPile = [ ...(room.discard_pile ?? []), cardToDiscard ]

    // Update player's hand if replacing a card
    let updatedHand = player.hand
    if (replaceCardIndex !== undefined && replaceCardIndex !== null) {
      updatedHand = [...player.hand]
      updatedHand[replaceCardIndex] = {
        ...cardToDiscard,
        isFaceUp: false,
        position: replaceCardIndex,
      }

      await supabase
        .from('players')
        .update({ hand: updatedHand })
        .eq('id', playerId)
    }

    // Advance turn (players is guaranteed)
    const nextTurn = (room.current_turn + 1) % players.length

    await supabase
      .from('game_rooms')
      .update({
        discard_pile: updatedDiscardPile,
        current_turn: nextTurn,
      })
      .eq('id', roomId)

    // Log action
    await supabase.from('game_actions').insert({
      room_id: roomId,
      player_id: playerId,
      action_type: 'discard',
      action_data: { cardId, replaceCardIndex },
      result: 'success',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Discard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
