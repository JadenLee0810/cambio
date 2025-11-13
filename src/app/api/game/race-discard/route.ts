import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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
  
  if (!room || !player) {
    return NextResponse.json({ error: 'Room or player not found' }, { status: 404 })
  }
  
  // Get top card from discard pile
  const topCard = room.discard_pile[room.discard_pile.length - 1]
  if (!topCard) {
    return NextResponse.json({ error: 'No card to match' }, { status: 400 })
  }
  
  // Find the card in player's hand
  const cardInHand = player.hand.find((c: any) => c.id === cardId)
  if (!cardInHand) {
    // Wrong card - add penalty
    const penaltyCard = room.deck[room.deck.length - 1]
    const newDeck = room.deck.slice(0, -1)
    const newHand = [...player.hand, { ...penaltyCard, isFaceUp: false, position: player.hand.length }]
    
    await supabase.from('players').update({ hand: newHand }).eq('id', playerId)
    await supabase.from('game_rooms').update({ deck: newDeck }).eq('id', roomId)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Card not in hand',
      penalty: true 
    })
  }
  
  // Check if card matches (same rank)
  if (cardInHand.rank !== topCard.rank) {
    // Wrong match - replace card and add penalty
    const replacementCard = room.deck[room.deck.length - 1]
    const penaltyCard = room.deck[room.deck.length - 2]
    const newDeck = room.deck.slice(0, -2)
    
    const newHand = player.hand.map((c: any) => 
      c.id === cardId ? { ...replacementCard, isFaceUp: false, position: c.position } : c
    )
    newHand.push({ ...penaltyCard, isFaceUp: false, position: newHand.length })
    
    await supabase.from('players').update({ hand: newHand }).eq('id', playerId)
    await supabase.from('game_rooms').update({ deck: newDeck }).eq('id', roomId)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Wrong card',
      penalty: true 
    })
  }
  
  // Success! Remove card from hand
  const newHand = player.hand.filter((c: any) => c.id !== cardId)
  const newDiscardPile = [...room.discard_pile, cardInHand]
  
  await supabase.from('players').update({ hand: newHand }).eq('id', playerId)
  await supabase.from('game_rooms').update({ discard_pile: newDiscardPile }).eq('id', roomId)
  
  // Log action
  await supabase.from('game_actions').insert({
    room_id: roomId,
    player_id: playerId,
    action_type: 'race_discard',
    action_data: { cardId },
    result: 'success'
  })
  
  return NextResponse.json({ success: true })
}