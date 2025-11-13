import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { roomId, playerId, cardId, usePower, drawnCardData } = await request.json()
    
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
    
    let discardedCard
    let newHand = player.hand
    
    // Check if this is a drawn card being discarded directly
    if (drawnCardData) {
      // This is a drawn card, not from hand
      discardedCard = drawnCardData
    } else {
      // Card is from player's hand
      const cardIndex = player.hand.findIndex((c: any) => c.id === cardId)
      if (cardIndex !== -1) {
        discardedCard = player.hand[cardIndex]
        newHand = player.hand.filter((c: any) => c.id !== cardId)
        
        // Update player hand
        await supabase
          .from('players')
          .update({ hand: newHand })
          .eq('id', playerId)
      } else {
        return NextResponse.json({ error: 'Card not found' }, { status: 400 })
      }
    }
    
    // Add to discard pile
    const newDiscardPile = [...room.discard_pile, discardedCard]
    
    // Check if deck needs reshuffling
    let newDeck = room.deck
    if (newDeck.length === 0 && newDiscardPile.length > 1) {
      // Reshuffle discard pile (except top card) back into deck
      const topCard = newDiscardPile[newDiscardPile.length - 1]
      const cardsToShuffle = newDiscardPile.slice(0, -1)
      
      // Shuffle
      const shuffled = [...cardsToShuffle]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      
      newDeck = shuffled
      // Update discard pile to just have top card
      await supabase
        .from('game_rooms')
        .update({ 
          deck: newDeck,
          discard_pile: [topCard]
        })
        .eq('id', roomId)
    } else {
      await supabase
        .from('game_rooms')
        .update({ discard_pile: newDiscardPile })
        .eq('id', roomId)
    }
    
    // DON'T advance turn yet if there's a power and player wants to use it
    const hasPower = discardedCard.power && discardedCard.power !== 'wild'
    
    if (!hasPower || usePower === false) {
      // No power or player skipped power - advance turn
      const nextTurn = (room.current_turn + 1) % allPlayers.length
      await supabase
        .from('game_rooms')
        .update({ current_turn: nextTurn })
        .eq('id', roomId)
    }
    
    // Log action
    await supabase.from('game_actions').insert({
      room_id: roomId,
      player_id: playerId,
      action_type: 'discard',
      action_data: { cardId, power: discardedCard.power, usePower },
      result: 'success'
    })
    
    // Return info about the discarded card's power
    return NextResponse.json({ 
      success: true,
      power: hasPower ? discardedCard.power : null,
      card: discardedCard,
      shouldActivatePower: hasPower && usePower !== false
    })
  } catch (error) {
    console.error('Discard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}