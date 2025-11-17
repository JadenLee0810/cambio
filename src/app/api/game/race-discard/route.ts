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

        // Find first null position or add to end
        const myHand = [...myPlayer.hand]
        const firstNullIndex = myHand.findIndex((c: any) => c === null)
        
        if (firstNullIndex !== -1) {
          myHand[firstNullIndex] = {
            ...penaltyCard,
            isFaceUp: false,
            position: firstNullIndex
          }
        } else {
          myHand.push({
            ...penaltyCard,
            isFaceUp: false,
            position: myHand.length
          })
        }

        await supabase
          .from('players')
          .update({ hand: myHand })
          .eq('id', playerId)

        // Put wrong card on discard pile and set it as null in opponent's hand
        const newDiscardPile = [...room.discard_pile, cardToDiscard]
        const cardIndex = opponent.hand.findIndex((c: any) => c && c.id === cardId)
        const newOpponentHand = [...opponent.hand]
        newOpponentHand[cardIndex] = null

        await supabase
          .from('players')
          .update({ hand: newOpponentHand })
          .eq('id', opponentId)

        await supabase
          .from('game_rooms')
          .update({ 
            deck: newDeck,
            discard_pile: newDiscardPile
          })
          .eq('id', roomId)

        return NextResponse.json({ 
          success: false, 
          penalty: true, 
          error: 'Wrong card! It went to discard pile and you got a penalty card.' 
        })
      }

      // Valid discard - replace opponent's card with yours
      const cardIndex = opponent.hand.findIndex((c: any) => c && c.id === cardId)
      const newOpponentHand = [...opponent.hand]
      newOpponentHand[cardIndex] = { ...cardToGive, position: cardIndex, isFaceUp: false }

      // Remove card from my hand (set to null to maintain positions)
      const myCardIndex = myPlayer.hand.findIndex((c: any) => c && c.id === cardToGiveId)
      const newMyHand = [...myPlayer.hand]
      newMyHand[myCardIndex] = null

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
        .update({ discard_pile: newDiscardPile })
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
        // PENALTY: Wrong card goes to discard, replace it + add penalty card
        if (room.deck.length < 2) {
          return NextResponse.json({ error: 'Not enough cards in deck for penalty' }, { status: 400 })
        }

        const replacementCard = room.deck[0]
        const penaltyCard = room.deck[1]
        const newDeck = room.deck.slice(2)

        // Replace the wrong card and add penalty
        const cardIndex = player.hand.findIndex((c: any) => c && c.id === cardId)
        const newHand = [...player.hand]
        
        // Replace at same position
        newHand[cardIndex] = { ...replacementCard, position: cardIndex, isFaceUp: false }
        
        // Add penalty card to first null position or end
        const firstNullIndex = newHand.findIndex((c: any) => c === null)
        if (firstNullIndex !== -1) {
          newHand[firstNullIndex] = {
            ...penaltyCard,
            isFaceUp: false,
            position: firstNullIndex
          }
        } else {
          newHand.push({
            ...penaltyCard,
            isFaceUp: false,
            position: newHand.length
          })
        }

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
            discard_pile: newDiscardPile
          })
          .eq('id', roomId)

        return NextResponse.json({ 
          success: false, 
          penalty: true, 
          error: 'Wrong card! It went to discard pile, your card was replaced, and you got a penalty card.' 
        })
      }

      // Valid discard - set card position to null (maintain positions)
      const cardIndex = player.hand.findIndex((c: any) => c && c.id === cardId)
      const newHand = [...player.hand]
      newHand[cardIndex] = null

      await supabase
        .from('players')
        .update({ hand: newHand })
        .eq('id', playerId)

      const newDiscardPile = [...room.discard_pile, cardToDiscard]

      await supabase
        .from('game_rooms')
        .update({ discard_pile: newDiscardPile })
        .eq('id', roomId)

      return NextResponse.json({ success: true })
    }

  } catch (error) {
    console.error('Error in race discard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}