import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { playerId, cardId } = await request.json()

  try {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Find the card in their hand
    const card = player.hand.find((c: any) => c && c.id === cardId)

    if (!card) {
      return NextResponse.json({ 
        error: 'Card not found',
        success: false 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      card 
    })
  } catch (error) {
    console.error('Error peeking card:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 })
  }
}