'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'
import { PlayerHand } from '@/components/game/PlayerHand/PlayerHand'
import { OpponentHand } from '@/components/game/PlayerHand/OpponentHand'
import { Deck } from '@/components/game/Deck/Deck'
import { DiscardPile } from '@/components/game/Deck/DiscardPile'
import { Card as CardType } from '@/types/card'
import { Player } from '@/types/player'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [loading, setLoading] = useState(true)
  const [drawnCard, setDrawnCard] = useState<CardType | null>(null)
  const [activePower, setActivePower] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  const [showRaceButton, setShowRaceButton] = useState(false)
  const [revealedCard, setRevealedCard] = useState<CardType | null>(null)
  
  const {
    room,
    players,
    my_player_id,
    subscribeToRoom,
    unsubscribe,
    isConnected,
    setGameState
  } = useGameStore()

  const myPlayer = players.find(p => p.id === my_player_id)

  useEffect(() => {
    const loadGameData = async () => {
      const supabase = createClient()
      const playerId = localStorage.getItem('playerId')
      
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
      
      const validPlayer = playersData?.find(p => p.id === playerId)
      
      if (roomData && playersData) {
        setGameState({
          room: roomData,
          players: playersData,
          my_player_id: validPlayer ? playerId || undefined : undefined
        })
      }
      
      setLoading(false)
    }
    
    loadGameData()
    subscribeToRoom(roomId)
    
    return () => unsubscribe()
  }, [roomId])

  // Watch for new cards in discard pile for race-to-discard
  useEffect(() => {
    if (room && room.discard_pile.length > 0 && myPlayer) {
      const isMyTurn = room.current_turn === myPlayer.player_index
      if (!isMyTurn) {
        const topCard = room.discard_pile[room.discard_pile.length - 1]
        
        // Check if I have a matching card
        const hasMatch = myPlayer.hand.some((c: any) => c.rank === topCard.rank)
        setShowRaceButton(hasMatch)
        
        // Auto-hide after 3 seconds
        if (hasMatch) {
          setTimeout(() => setShowRaceButton(false), 3000)
        }
      }
    }
  }, [room?.discard_pile, room?.current_turn, myPlayer])

  const confirmPeek = async () => {
    await fetch('/api/game/confirm-peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id
      })
    })
  }

  const handleDrawDeck = async () => {
    const response = await fetch('/api/game/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        source: 'deck'
      })
    })
    
    const data = await response.json()
    if (data.success) {
      setDrawnCard(data.card)
    }
  }

  const handleDrawDiscard = async () => {
    const response = await fetch('/api/game/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        source: 'discard'
      })
    })
    
    const data = await response.json()
    if (data.success) {
      setDrawnCard(data.card)
    }
  }

  const handleDiscardDrawnCard = async () => {
    if (!drawnCard) return
    
    // Discard the drawn card directly (no need to add to hand first)
    const response = await fetch('/api/game/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId: drawnCard.id,
        usePower: true,
        drawnCardData: drawnCard  // Pass the drawn card data
      })
    })
    
    const data = await response.json()
    if (data.success && data.power) {
      setActivePower(data.power)
    }
    
    setDrawnCard(null)
  }

  const handleSwapWithDrawnCard = async (handCardId: string) => {
    if (!drawnCard) return
    
    const cardToRemove = myPlayer!.hand.find((c: any) => c.id === handCardId)
    if (!cardToRemove) return
    
    // Replace the card in hand with the drawn card
    const newHand = myPlayer!.hand.map((c: any) => {
      if (c.id === handCardId) {
        return {
          ...drawnCard,
          isFaceUp: false,
          position: c.position
        }
      }
      return c
    })
    
    const supabase = createClient()
    await supabase
      .from('players')
      .update({ hand: newHand })
      .eq('id', my_player_id)
    
    // Discard the removed card
    const response = await fetch('/api/game/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId: cardToRemove.id,
        usePower: true
      })
    })
    
    const data = await response.json()
    if (data.success && data.power) {
      setActivePower(data.power)
    }
    
    setDrawnCard(null)
  }

  const handlePeekOwnCard = async (cardId: string) => {
    await fetch('/api/game/peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: my_player_id,
        cardId
      })
    })
    
    setActivePower(null)
  }

  const handlePeekOpponentCard = async (opponentId: string, cardId: string) => {
    const opponent = players.find(p => p.id === opponentId)
    if (!opponent) return
    
    const card = opponent.hand.find((c: any) => c.id === cardId)
    if (card) {
      setRevealedCard(card)
      setTimeout(() => {
        setRevealedCard(null)
        setActivePower(null)
      }, 3000)
    }
  }

  const handleBlindSwap = async (card1Id: string, card2Id: string, player1Id: string, player2Id: string) => {
    // For J/Q blind swap
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', player1Id).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', player2Id).single()
    
    if (!player1 || !player2) return
    
    const card1 = player1.hand.find((c: any) => c.id === card1Id)
    const card2 = player2.hand.find((c: any) => c.id === card2Id)
    
    if (!card1 || !card2) return
    
    const newHand1 = player1.hand.map((c: any) => 
      c.id === card1Id ? { ...card2, position: card1.position, isFaceUp: false } : c
    )
    
    const newHand2 = player2.hand.map((c: any) => 
      c.id === card2Id ? { ...card1, position: card2.position, isFaceUp: false } : c
    )
    
    await supabase.from('players').update({ hand: newHand1 }).eq('id', player1Id)
    await supabase.from('players').update({ hand: newHand2 }).eq('id', player2Id)
    
    setActivePower(null)
    setSelectedCard(null)
    setSelectedOpponent(null)
  }

  const handleBlackKingPower = async (targetPlayerId: string, targetCardId: string, myCardId: string) => {
    const response = await fetch('/api/game/black-king-power', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: my_player_id,
        targetPlayerId,
        targetCardId,
        myCardId
      })
    })
    
    const data = await response.json()
    if (data.success) {
      setRevealedCard(data.targetCard)
      setTimeout(() => {
        setRevealedCard(null)
        setActivePower(null)
        setSelectedCard(null)
        setSelectedOpponent(null)
      }, 2000)
    }
  }

  const handleRaceDiscard = async () => {
    if (!room) return
    
    const topCard = room.discard_pile[room.discard_pile.length - 1]
    const matchingCard = myPlayer?.hand.find((c: any) => c.rank === topCard.rank)
    
    if (!matchingCard) return
    
    const response = await fetch('/api/game/race-discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId: matchingCard.id
      })
    })
    
    const data = await response.json()
    setShowRaceButton(false)
    
    if (data.penalty) {
      alert(data.error + ' - Penalty card added!')
    }
  }

  const handleCallCambio = async () => {
    const confirmed = window.confirm('Are you sure you want to call Cambio? Your cards will be frozen!')
    if (!confirmed) return
    
    await fetch('/api/game/call-cambio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id
      })
    })
  }

  const handleDebugRevealAll = async () => {
    const supabase = createClient()
    // Reveal all cards for all players
    for (const player of players) {
      const revealedHand = player.hand.map((c: any) => ({ ...c, isFaceUp: true }))
      await supabase
        .from('players')
        .update({ hand: revealedHand })
        .eq('id', player.id)
    }
  }

  const handleCardClick = (card: any) => {
    if (drawnCard && isMyTurn) {
      // Swapping drawn card with hand card
      handleSwapWithDrawnCard(card.id)
    } else if (activePower === 'peek_own') {
      handlePeekOwnCard(card.id)
    } else if (activePower === 'swap' || activePower === 'blind_swap') {
      if (!selectedCard) {
        setSelectedCard(card.id)
      } else {
        // Second card selected - perform swap
        handleBlindSwap(selectedCard, card.id, my_player_id!, my_player_id!)
      }
    } else if (activePower === 'black_king') {
      if (!selectedCard) {
        setSelectedCard(card.id)
      }
    }
  }

  const handleOpponentCardClick = (opponent: Player, card: any) => {
    if (activePower === 'peek_opponent') {
      handlePeekOpponentCard(opponent.id, card.id)
    } else if (activePower === 'swap' || activePower === 'blind_swap') {
      if (!selectedCard) {
        setSelectedOpponent(opponent.id)
        setSelectedCard(card.id)
      } else if (selectedOpponent) {
        // Second card selected - perform swap
        handleBlindSwap(selectedCard, card.id, my_player_id!, opponent.id)
      }
    } else if (activePower === 'black_king' && selectedCard) {
      handleBlackKingPower(opponent.id, card.id, selectedCard)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Game not found</div>
      </div>
    )
  }

  // Define all variables here after room check
  const isPlaying = room.status === 'playing'
  const isPeekPhase = room.game_phase === 'setup'
  const isActualGame = room.game_phase === 'playing'
  const isMyTurn = myPlayer && room.current_turn === myPlayer.player_index
  const isGameOver = room.status === 'finished'
  const isCambioPhase = room.cambio_caller_id !== null && room.cambio_caller_id !== undefined
  const isFrozen = room.cambio_caller_id === my_player_id

  if (room && room.status !== 'playing' && room.status !== 'finished') {
    router.push(`/waiting/${roomId}`)
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-4 mb-8 border border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-serif font-bold text-white">Cambio</h1>
              <p className="text-slate-400">Room Code: <span className="font-mono font-bold text-white">{room.room_code}</span></p>
            </div>
            <div className="flex items-center gap-4">
              {/* DEBUG BUTTON */}
              {isActualGame && (
                <button
                  onClick={handleDebugRevealAll}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-bold text-sm"
                >
                  🐛 DEBUG: Reveal All
                </button>
              )}
              
              {isCambioPhase && (
                <div className="bg-yellow-600 text-white px-3 py-1 rounded font-bold">
                  🔔 CAMBIO CALLED!
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-slate-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Peek Phase */}
        {isPlaying && isPeekPhase && myPlayer && (
          <div className="text-center space-y-8">
            <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-4">
                📖 Memorize Your Bottom Cards
              </h2>
              <p className="text-slate-300 mb-6">
                Look at your bottom 2 cards and remember them. Click "Ready" when you've memorized them.
              </p>
              
              <div className="flex justify-center gap-3 mb-6">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`px-3 py-1 rounded ${
                      player.has_peeked 
                        ? 'bg-green-600 text-white' 
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {player.username} {player.has_peeked ? '✓' : '...'}
                  </div>
                ))}
              </div>

              {!myPlayer.has_peeked ? (
                <button
                  onClick={confirmPeek}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
                >
                  I've Memorized My Cards - Ready!
                </button>
              ) : (
                <p className="text-yellow-400">Waiting for other players...</p>
              )}
            </div>

            <div className="flex justify-center">
              <PlayerHand
                cards={myPlayer.hand}
                isMyTurn={false}
                onCardClick={() => {}}
              />
            </div>
          </div>
        )}

        {/* Actual Game */}
        {isPlaying && isActualGame && myPlayer && !isGameOver && (
          <div className="mt-8">
            <div className="text-center mb-8">
              <h2 className="text-white text-2xl font-bold">
                {isFrozen ? "🔒 Your Cards Are Frozen" : 
                 isMyTurn ? "Your Turn!" : `${players[room.current_turn]?.username}'s Turn`}
              </h2>
              {activePower && (
                <p className="text-yellow-400 mt-2">
                  ⚡ Active Power: {activePower.replace('_', ' ').toUpperCase()}
                </p>
              )}
            </div>

            {/* Revealed Card Modal */}
            {revealedCard && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
                  <h3 className="text-white text-xl mb-4">Card Revealed!</h3>
                  <div className="flex justify-center">
                    <div className="w-32 h-48">
                      <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                        <div className="text-xl font-bold text-red-600">
                          <div>{revealedCard.rank}</div>
                          <div>{revealedCard.suit === 'hearts' ? '♥' : revealedCard.suit === 'diamonds' ? '♦' : revealedCard.suit === 'clubs' ? '♣' : '♠'}</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center text-4xl text-red-600">
                          {revealedCard.suit === 'hearts' ? '♥' : revealedCard.suit === 'diamonds' ? '♦' : revealedCard.suit === 'clubs' ? '♣' : '♠'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Drawn Card Display */}
            {drawnCard && isMyTurn && (
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-lg p-6 border-2 border-blue-500">
                <h3 className="text-white text-xl mb-4 text-center">You Drew:</h3>
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-48">
                    <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                      <div className="text-xl font-bold" style={{ color: drawnCard.suit === 'hearts' || drawnCard.suit === 'diamonds' ? 'red' : 'black' }}>
                        <div>{drawnCard.rank}</div>
                        <div>{drawnCard.suit === 'hearts' ? '♥' : drawnCard.suit === 'diamonds' ? '♦' : drawnCard.suit === 'clubs' ? '♣' : '♠'}</div>
                      </div>
                      <div className="flex-1 flex items-center justify-center text-4xl" style={{ color: drawnCard.suit === 'hearts' || drawnCard.suit === 'diamonds' ? 'red' : 'black' }}>
                        {drawnCard.suit === 'hearts' ? '♥' : drawnCard.suit === 'diamonds' ? '♦' : drawnCard.suit === 'clubs' ? '♣' : '♠'}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm text-center">Discard it or click a card in your hand to swap</p>
              </div>
            )}

            {/* Race-to-Discard Button */}
            {showRaceButton && !isMyTurn && (
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
                <button
                  onClick={handleRaceDiscard}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-bold text-xl shadow-2xl animate-pulse"
                >
                  ⚡ RACE DISCARD!
                </button>
              </div>
            )}

            <div className="flex justify-center gap-6 mb-8">
              {players
                .filter(p => p.id !== my_player_id)
                .map(opponent => (
                  <div key={opponent.id} onClick={() => activePower ? null : null}>
                    <OpponentHand player={opponent} />
                  </div>
                ))}
            </div>

            <div className="flex justify-center gap-8 mb-16">
              <Deck 
                cardCount={room.deck.length}
                onDraw={handleDrawDeck}
                canDraw={isMyTurn && !drawnCard && !activePower && !isFrozen}
              />
              <DiscardPile 
                cards={room.discard_pile}
                onDraw={handleDrawDiscard}
                canDraw={isMyTurn && !drawnCard && !activePower && !isFrozen && room.discard_pile.length > 0}
              />
            </div>

            {/* Game Controls */}
            {isMyTurn && !isFrozen && (
              <div className="fixed top-24 right-8 bg-slate-800 rounded-lg shadow-lg p-4 space-y-3 min-w-[200px] border border-slate-700">
                <h3 className="font-bold text-lg text-white">Your Turn</h3>
                
                {!drawnCard && !activePower && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">Draw a card or call Cambio</p>
                    <button
                      onClick={handleCallCambio}
                      className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 font-bold"
                    >
                      🔔 Call Cambio!
                    </button>
                  </div>
                )}
                
                {drawnCard && !activePower && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">You drew a card!</p>
                    <button
                      onClick={handleDiscardDrawnCard}
                      className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
                    >
                      Discard Drawn Card
                    </button>
                    <p className="text-xs text-slate-400 text-center">OR</p>
                    <p className="text-xs text-slate-300">Click a card in your hand to swap</p>
                  </div>
                )}
                
                {activePower && (
                  <div className="space-y-2">
                    <p className="text-sm text-yellow-400">Use your power!</p>
                    <button
                      onClick={() => setActivePower(null)}
                      className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                    >
                      Skip Power
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="fixed bottom-8 right-8">
              <PlayerHand
                cards={myPlayer.hand}
                isMyTurn={!!isMyTurn && !isFrozen}
                onCardClick={handleCardClick}
              />
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="text-center space-y-6">
            <h2 className="text-white text-4xl font-bold">Game Over!</h2>
            <div className="bg-slate-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto border border-slate-700">
              <h3 className="text-2xl font-bold mb-4 text-white">Final Scores</h3>
              <div className="space-y-3">
                {[...players]
                  .sort((a, b) => a.score - b.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-4 rounded-lg ${
                        index === 0 ? 'bg-yellow-900/30 border-2 border-yellow-600' : 'bg-slate-700 border border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg text-white">
                          {index === 0 && '👑 '}
                          {player.username}
                          {player.id === my_player_id && ' (You)'}
                          {player.id === room.cambio_caller_id && ' (Called Cambio)'}
                        </span>
                        <span className="text-2xl font-bold text-white">{player.score} pts</span>
                      </div>
                    </div>
                  ))}
              </div>
              <button
                onClick={() => window.location.href = '/lobby'}
                className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}