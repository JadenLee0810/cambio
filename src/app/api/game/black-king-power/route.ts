import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { playerId, targetPlayerId, targetCardId, myCardId } = await request.json()
  
  // Get both players
  const { data: myPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single()
  
  const { data: targetPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('id', targetPlayerId)
    .single()
  
  if (!myPlayer || !targetPlayer) {
    return NextResponse.json({ error: 'Players not found' }, { status: 404 })
  }
  
  // Find the cards
  const myCard = myPlayer.hand.find((c: any) => c.id === myCardId)
  const targetCard = targetPlayer.hand.find((c: any) => c.id === targetCardId)
  
  if (!myCard || !targetCard) {
    return NextResponse.json({ error: 'Cards not found' }, { status: 404 })
  }
  
  // Swap the cards
  const myNewHand = myPlayer.hand.map((c: any) => 
    c.id === myCardId ? { ...targetCard, position: myCard.position, isFaceUp: false } : c
  )
  
  const targetNewHand = targetPlayer.hand.map((c: any) => 
    c.id === targetCardId ? { ...myCard, position: targetCard.position, isFaceUp: false } : c
  )
  
  await supabase.from('players').update({ hand: myNewHand }).eq('id', playerId)
  await supabase.from('players').update({ hand: targetNewHand }).eq('id', targetPlayerId)
  
  return NextResponse.json({ success: true, targetCard })
}