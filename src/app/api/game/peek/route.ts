import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { playerId, cardIndex } = await request.json()
    
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Temporarily reveal the card
    const updatedHand = [...player.hand]
    updatedHand[cardIndex] = {
      ...updatedHand[cardIndex],
      isFaceUp: true
    }
    
    await supabase
      .from('players')
      .update({ hand: updatedHand })
      .eq('id', playerId)
    
    // Auto-hide after 3 seconds
    setTimeout(async () => {
      const { data: currentPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()
      
      if (currentPlayer) {
        const reHiddenHand = [...currentPlayer.hand]
        reHiddenHand[cardIndex] = {
          ...reHiddenHand[cardIndex],
          isFaceUp: false
        }
        
        await supabase
          .from('players')
          .update({ hand: reHiddenHand })
          .eq('id', playerId)
      }
    }, 3000)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Peek error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}