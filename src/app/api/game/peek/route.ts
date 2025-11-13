import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { playerId, cardId } = await request.json()
  
  // Get the player
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()
  
  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }
  
  // Find the card in their hand
  const card = player.hand.find((c: any) => c.id === cardId)
  
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }
  
  // DON'T update database - just return the card data for local display
  return NextResponse.json({ 
    success: true,
    card: card
  })
}