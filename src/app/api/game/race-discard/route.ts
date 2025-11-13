import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId, playerId, cardId, isOpponentCard, opponentId, cardToGiveId } = await request.json()
  
  // Get current game state
  const { data: room } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }
  
  // Get top card from discard pile
  const topCard = room.discard_pile[room.discard_pile.length - 1]
  if (!topCard) {
    return NextResponse.json({ error: 'No card to match' }, { status: 400 })
  }
  
  // Determine whose card we're discarding
  const targetPlayerId = isOpponentCard ? opponentId : playerId
  
  const { data: targetPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', targetPlayerId)
    .single()
  
  const { data: actingPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()
  
  if (!targetPlayer || !actingPlayer) {
    return NextResponse.json({ error: 'Players not found' }, { status: 404 })
  }
  
  // Find the card in target player's hand
  const cardInHand = targetPlayer.hand.find((c: any) => c.id === cardId)
  if (!cardInHand) {
    // Wrong card - add penalty to acting player
    if (room.deck.length === 0) {
      return NextResponse.json({ error: 'Deck is empty' }, { status: 400 })
    }
    
    const penaltyCard = room.deck[room.deck.length - 1]
    const newDeck = room.deck.slice(0, -1)
    
    // Find first empty position or add to end
    const emptyPosition = actingPlayer.hand.findIndex((c: any) => c === null)
    let newHand
    if (emptyPosition !== -1) {
      // Fill empty slot
      newHand = [...actingPlayer.hand]
      newHand[emptyPosition] = { ...penaltyCard, isFaceUp: false, position: emptyPosition }
    } else {
      // Add to end
      newHand = [...actingPlayer.hand, { ...penaltyCard, isFaceUp: false, position: actingPlayer.hand.length }]
    }
    
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
    // Wrong match - replace card in target player's hand and add penalty to acting player
    if (room.deck.length < 2) {
      return NextResponse.json({ error: 'Not enough cards in deck' }, { status: 400 })
    }
    
    const replacementCard = room.deck[room.deck.length - 1]
    const penaltyCard = room.deck[room.deck.length - 2]
    const newDeck = room.deck.slice(0, -2)
    
    // Replace the card in target player's hand (keep position)
    const targetNewHand = targetPlayer.hand.map((c: any) => 
      c && c.id === cardId ? { ...replacementCard, isFaceUp: false, position: c.position } : c
    )
    
    // Add penalty to acting player
    const emptyPosition = actingPlayer.hand.findIndex((c: any) => c === null)
    let actingNewHand
    if (emptyPosition !== -1) {
      actingNewHand = [...actingPlayer.hand]
      actingNewHand[emptyPosition] = { ...penaltyCard, isFaceUp: false, position: emptyPosition }
    } else {
      actingNewHand = [...actingPlayer.hand, { ...penaltyCard, isFaceUp: false, position: actingPlayer.hand.length }]
    }
    
    await supabase.from('players').update({ hand: targetNewHand }).eq('id', targetPlayerId)
    await supabase.from('players').update({ hand: actingNewHand }).eq('id', playerId)
    await supabase.from('game_rooms').update({ deck: newDeck }).eq('id', roomId)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Wrong card',
      penalty: true 
    })
  }
  
  // Success! Remove card from target player's hand (leave empty slot)
  const cardPosition = cardInHand.position
  const targetNewHand = targetPlayer.hand.map((c: any) => 
    c && c.id === cardId ? null : c
  )
  
  const newDiscardPile = [...room.discard_pile, cardInHand]
  
  await supabase.from('players').update({ hand: targetNewHand }).eq('id', targetPlayerId)
  await supabase.from('game_rooms').update({ discard_pile: newDiscardPile }).eq('id', roomId)
  
  // If acting player discarded someone else's card, give them one of acting player's cards
  if (isOpponentCard && actingPlayer.hand.length > 0 && cardToGiveId) {
    // Find the specific card the acting player chose to give
    const cardToGive = actingPlayer.hand.find((c: any) => c && c.id === cardToGiveId)
    
    if (cardToGive) {
      // Remove from acting player (leave empty slot)
      const actingNewHand = actingPlayer.hand.map((c: any) => 
        c && c.id === cardToGiveId ? null : c
      )
      
      // Add to opponent's empty slot or end
      const emptyPosition = targetNewHand.findIndex((c: any) => c === null)
      let opponentNewHand
      if (emptyPosition !== -1) {
        opponentNewHand = [...targetNewHand]
        opponentNewHand[emptyPosition] = { ...cardToGive, isFaceUp: false, position: emptyPosition }
      } else {
        opponentNewHand = [...targetNewHand, { ...cardToGive, isFaceUp: false, position: targetNewHand.length }]
      }
      
      await supabase.from('players').update({ hand: actingNewHand }).eq('id', playerId)
      await supabase.from('players').update({ hand: opponentNewHand }).eq('id', targetPlayerId)
    }
  }
  
  // Log action
  await supabase.from('game_actions').insert({
    room_id: roomId,
    player_id: playerId,
    action_type: 'race_discard',
    action_data: { cardId, isOpponentCard, targetPlayerId, cardToGiveId },
    result: 'success'
  })
  
  return NextResponse.json({ success: true })
}