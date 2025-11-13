import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDeck, shuffleDeck } from '@/lib/game-logic/deck'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId } = await request.json()
  
  // Get room and players
  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('player_index')
  
  if (!room || !players || players.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
  }
  
  // Check if all players are ready
  const allReady = players.every(p => p.is_ready)
  if (!allReady) {
    return NextResponse.json({ error: 'Not all players are ready' }, { status: 400 })
  }
  
  // Create and shuffle deck
  const deck = shuffleDeck(createDeck())
  
  // Deal 4 cards to each player
  const cardsPerPlayer = 4
  let deckIndex = 0
  
  for (const player of players) {
    const hand = []
    for (let i = 0; i < cardsPerPlayer; i++) {
      // Show bottom 2 cards (position 2 and 3 in 2x2 grid)
      const isFaceUp = i === 2 || i === 3
      hand.push({
        ...deck[deckIndex++],
        isFaceUp: isFaceUp,
        position: i
      })
    }
    
    // Update player's hand
    await supabase
      .from('players')
      .update({ 
        hand,
        has_peeked: false,
        is_ready: false // Reset ready status for peek phase
      })
      .eq('id', player.id)
  }
  
  // Start with EMPTY discard pile
  const discardPile: any[] = []
  const remainingDeck = deck.slice(deckIndex)
  
  // Update room to started with peek phase
  const { data: updatedRoom, error } = await supabase
    .from('game_rooms')
    .update({
      status: 'playing',
      game_phase: 'setup', // Start in setup phase for peeking
      started_at: new Date().toISOString(),
      deck: remainingDeck,
      discard_pile: discardPile,
      current_turn: 0
    })
    .eq('id', roomId)
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true, room: updatedRoom })
}