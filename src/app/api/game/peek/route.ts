import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { playerId, cardId } = await request.json()
    
    // Get player
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Find card and flip it
    const newHand = player.hand.map((c: any) => {
      if (c.id === cardId) {
        return { ...c, isFaceUp: true }
      }
      return c
    })
    
    // Update player hand
    await supabase
      .from('players')
      .update({ hand: newHand })
      .eq('id', playerId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Peek error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}