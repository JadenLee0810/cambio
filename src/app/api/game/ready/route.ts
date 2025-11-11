import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { playerId, isReady } = body
    
    console.log('Received request:', { playerId, isReady })
    
    // First check if player exists
    const { data: checkPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
    
    console.log('Player check result:', checkPlayer)
    
    // Update player
    const { data, error } = await supabase
      .from('players')
      .update({ is_ready: isReady })
      .eq('id', playerId)
      .select()
    
    console.log('Update result:', { data, error })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, player: data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}