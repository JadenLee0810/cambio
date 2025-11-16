import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { roomId, playerId, cardId, isOpponentCard, opponentId, cardToGiveId } = await request.json()

    const supabase = await createClient()

    // Get room and validate
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!room || room.discard_pile.length === 0) {
      return NextResponse.json({ error: 'No card to match' }, { status: 400 })
    }

    // Check if race discard already happened this turn
    if (room.race_discard_used_this_turn) {
      return NextResponse.json({ 
        error: 'Race discard already used this turn',
        alreadyUsed: true 
      }, { status: 400 })
    }

    const topCard = room.discard_pile[room.discard_pile.length - 1]

    if (isOpponentCard) {
      // Discarding opponent's card
      const { data: opponent } = await supabase
        .from('players')
        .select('*')
        .eq('id', opponentId)
        .single()

      const { data: myPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (!opponent || !myPlayer) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 })
      }

      const cardToDiscard = opponent.hand.find((c: any) => c && c.id === cardId)
      const cardToGive = myPlayer.hand.find((c: any) => c && c.id === cardToGiveId)

      if (!cardToDiscard || !cardToGive) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 })
      }

      // Check if rank matches
      if (cardToDiscard.rank !== topCard.rank) {
        // PENALTY: Wrong card goes to discard pile, give penalty card to player who made mistake
        if (room.deck.length === 0) {
          return NextResponse.json({ error: 'No cards left in deck for penalty' }, { status: 400 })
        }

        const penaltyCard = room.deck[0]
        const newDeck = room.deck.slice(1)

        // Add penalty card to the player who made the mistake
        const newHand = [...myPlayer.hand, {
          ...penaltyCard,
          isFaceUp: false,
          position: myPlayer.hand.length
        }]

        await supabase
          .from('players')
          .update({ hand: newHand })
          .eq('id', playerId)

        // Put the wrong card on discard pile
        const newDiscardPile = [...room.discard_pile, cardToDiscard]

        // Remove card from opponent's hand (leave empty space)
        const newOpponentHand = opponent.hand.map((c: any) => 
          c && c.id === cardId ? null : c
        )

        await supabase
          .from('players')
          .update({ hand: newOpponentHand })
          .eq('id', opponentId)

        await supabase
          .from('game_rooms')
          .update({ 
            deck: newDeck,
            discard_pile: newDiscardPile,
            race_discard_used_this_turn: true
          })
          .eq('id', roomId)

        return NextResponse.json({ 
          success: false, 
          penalty: true, 
          error: 'Wrong card! It went to discard pile and you got a penalty card.' 
        })
      }

      // Valid discard - remove from opponent, give them your card
      const newOpponentHand = opponent.hand.map((c: any) => {
        if (c && c.id === cardId) {
          return { ...cardToGive, position: c.position, isFaceUp: false }
        }
        return c
      })

      const newMyHand = myPlayer.hand.filter((c: any) => c && c.id !== cardToGiveId)

      await supabase
        .from('players')
        .update({ hand: newOpponentHand })
        .eq('id', opponentId)

      await supabase
        .from('players')
        .update({ hand: newMyHand })
        .eq('id', playerId)

      const newDiscardPile = [...room.discard_pile, cardToDiscard]

      await supabase
        .from('game_rooms')
        .update({ 
          discard_pile: newDiscardPile,
          race_discard_used_this_turn: true
        })
        .eq('id', roomId)

      return NextResponse.json({ success: true })

    } else {
      // Discarding own card
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 })
      }

      const cardToDiscard = player.hand.find((c: any) => c && c.id === cardId)

      if (!cardToDiscard) {
        return NextResponse.json({ error: 'Card not found in hand' }, { status: 404 })
      }

      // Check if rank matches
      if (cardToDiscard.rank !== topCard.rank) {
        // PENALTY: Wrong card goes to discard, get replacement + penalty
        if (room.deck.length < 2) {
          return NextResponse.json({ error: 'Not enough cards in deck for penalty' }, { status: 400 })
        }

        // Get replacement card and penalty card
        const replacementCard = room.deck[0]
        const penaltyCard = room.deck[1]
        const newDeck = room.deck.slice(2)

        // Replace the wrong card and add penalty
        const newHand = player.hand.map((c: any) => {
          if (c && c.id === cardId) {
            return { ...replacementCard, position: c.position, isFaceUp: false }
          }
          return c
        })

        // Add penalty card
        newHand.push({
          ...penaltyCard,
          isFaceUp: false,
          position: newHand.length
        })

        // Put wrong card on discard pile
        const newDiscardPile = [...room.discard_pile, cardToDiscard]

        await supabase
          .from('players')
          .update({ hand: newHand })
          .eq('id', playerId)

        await supabase
          .from('game_rooms')
          .update({ 
            deck: newDeck,
            discard_pile: newDiscardPile,
            race_discard_used_this_turn: true
          })
          .eq('id', roomId)

        return NextResponse.json({ 
          success: false, 
          penalty: true, 
          error: 'Wrong card! It went to discard pile, your card was replaced, and you got a penalty card.' 
        })
      }

      // Valid discard - remove card from hand (leave null/empty space)
      const newHand = player.hand.map((c: any) => 
        c && c.id === cardId ? null : c
      )

      await supabase
        .from('players')
        .update({ hand: newHand })
        .eq('id', playerId)

      const newDiscardPile = [...room.discard_pile, cardToDiscard]

      await supabase
        .from('game_rooms')
        .update({ 
          discard_pile: newDiscardPile,
          race_discard_used_this_turn: true
        })
        .eq('id', roomId)

      return NextResponse.json({ success: true })
    }

  } catch (error) {
    console.error('Error in race discard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}