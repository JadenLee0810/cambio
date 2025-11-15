import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json()

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the room
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)

    if (playersError || !players || players.length < 2) {
      return NextResponse.json({ error: 'Not enough players' }, { status: 400 })
    }

    // Create and shuffle deck
    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const powerMap: { [key: string]: string } = {
      '7': 'peek_own',
      '8': 'peek_own',
      '9': 'peek_opponent',
      '10': 'peek_opponent',
      'J': 'swap',
      'Q': 'swap',
      'K': 'wild'
    }
    const valueMap: { [key: string]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'A': 1
    }

    let deck: any[] = []
    let cardId = 0

    for (const suit of suits) {
      for (const rank of ranks) {
        const power = rank === 'K' && suit === 'spades' ? 'black_king' :
          rank === 'K' && suit === 'clubs' ? 'black_king' :
            powerMap[rank] || null

        const value = rank === 'K' ? 0 : valueMap[rank] || 0

        deck.push({
          id: `card-${cardId++}`,
          rank,
          suit,
          value,
          power,
          isFaceUp: false
        })
      }
    }

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]]
    }

    // Deal 4 cards to each player
    const cardsPerPlayer = 4
    const updatedPlayers = players.map((player, index) => {
      const hand = deck.splice(0, cardsPerPlayer).map((card, pos) => ({
        ...card,
        position: pos,
        isFaceUp: false
      }))

      return {
        ...player,
        hand
      }
    })

    // Update players with their hands
    for (const player of updatedPlayers) {
      await supabase
        .from('players')
        .update({ hand: player.hand, has_peeked: false })
        .eq('id', player.id)
    }

    // Place one card in discard pile
    const discardPile: any[] = []

    // Update room to start game
    await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        game_phase: 'setup',
        deck: deck,
        discard_pile: discardPile,
        current_turn: 0,
        started_at: new Date().toISOString()
      })
      .eq('id', roomId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}