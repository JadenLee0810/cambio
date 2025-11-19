import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json()
    const supabase = await createClient()

    console.log('🔚 END GAME API called for room:', roomId)

    // Get the room
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    console.log('📊 Current room status:', room.status)

    // If already finished, don't do anything
    if (room.status === 'finished') {
      console.log('⚠️ Game already finished')
      return NextResponse.json({ success: true, message: 'Game already finished' })
    }

    // Get all players
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)

    if (!players) {
      return NextResponse.json({ error: 'Players not found' }, { status: 404 })
    }

    console.log('👥 Players:', players.map(p => ({ name: p.username, cards: p.hand.filter((c: any) => c !== null).length })))

    // Calculate scores for each player
    const playersWithScores = players.map(player => {
      // Filter out null cards (discarded cards)
      const validCards = player.hand.filter((c: any) => c !== null)
      
      const score = validCards.reduce((total: number, card: any) => {
        if (!card) return total
        
        const rank = card.rank
        
        // Scoring rules
        if (rank === 'K') return total + 0 // Kings are 0
        if (rank === 'Q' || rank === 'J') return total + 10 // Queens and Jacks are 10
        if (rank === 'A') return total + 1 // Aces are 1
        
        // Number cards are face value
        const numValue = parseInt(rank)
        if (!isNaN(numValue)) {
          return total + numValue
        }
        
        return total
      }, 0)

      console.log(`  ${player.username}: ${score} points (${validCards.length} cards)`)

      return {
        ...player,
        score
      }
    })

    // Update each player's score
    for (const player of playersWithScores) {
      await supabase
        .from('players')
        .update({ score: player.score })
        .eq('id', player.id)
    }

    // Update room status to finished
    await supabase
      .from('game_rooms')
      .update({ 
        status: 'finished',
        game_phase: 'finished'
      })
      .eq('id', roomId)

    console.log('✅ Game ended successfully')

    return NextResponse.json({ 
      success: true,
      scores: playersWithScores.map(p => ({
        username: p.username,
        score: p.score
      }))
    })

  } catch (error) {
    console.error('❌ Error ending game:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}