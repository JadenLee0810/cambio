import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId, playerId, cardId, usePower, drawnCardData } = await request.json()

  try {
    // Get current room and player state
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Add card to discard pile
    const newDiscardPile = [...room.discard_pile, drawnCardData]

    // Check if deck needs reshuffling
    let newDeck = room.deck
    if (newDeck.length === 0 && newDiscardPile.length > 1) {
      // Reshuffle discard pile (except top card) into deck
      const topCard = newDiscardPile[newDiscardPile.length - 1]
      const cardsToShuffle = newDiscardPile.slice(0, -1)
      
      // Shuffle
      const shuffled = [...cardsToShuffle]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      
      newDeck = shuffled
      
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

    // Check if power should be activated
    const shouldActivatePower = usePower && drawnCardData.power && drawnCardData.power !== 'wild'
    let power = null

    if (shouldActivatePower) {
      // Map card powers to game actions
      if (drawnCardData.power === 'peek_own') {
        power = 'peek_own'
      } else if (drawnCardData.power === 'peek_opponent') {
        power = 'peek_opponent'
      } else if (drawnCardData.power === 'swap') {
        power = 'swap'
      } else if (drawnCardData.power === 'black_king') {
        power = 'blind_swap'  // THIS IS THE FIX
      }
    }

    return NextResponse.json({ 
      success: true,
      shouldActivatePower,
      power
    })
  } catch (error) {
    console.error('Error discarding card:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}