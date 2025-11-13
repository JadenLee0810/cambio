import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { roomId, playerId } = await request.json()
  
  // Mark the cambio caller
  await supabase
    .from('game_rooms')
    .update({ cambio_caller_id: playerId })
    .eq('id', roomId)
  
  return NextResponse.json({ success: true })
}