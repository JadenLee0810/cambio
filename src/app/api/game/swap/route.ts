import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { roomId, playerId, drawnCardId, handCardId } = await request.json()
    
    // Get player
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Find the card to swap out
    const cardIndex = player.hand.findIndex((c: any) => c.id === handCardId)
    if (cardIndex === -1) {
      return NextResponse.json({ error: 'Card not in hand' }, { status: 400 })
    }
    
    // Create new hand with the drawn card replacing the old card
    const newHand = [...player.hand]
    const removedCard = newHand[cardIndex]
    
    // The drawn card should be passed from the client with its properties
    newHand[cardIndex] = {
      ...removedCard, // Keep position
      id: drawnCardId,
      // Client will provide the full card details
    }
    
    // Update player hand
    await supabase
      .from('players')
      .update({ hand: newHand })
      .eq('id', playerId)
    
    return NextResponse.json({ success: true, removedCard })
  } catch (error) {
    console.error('Swap error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}