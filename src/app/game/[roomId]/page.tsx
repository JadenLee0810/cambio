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

type PowerMode = 'peek_own' | 'peek_opponent' | 'swap' | 'blind_swap' | null

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [loading, setLoading] = useState(true)
  const [drawnCard, setDrawnCard] = useState<CardType | null>(null)
  const [activePower, setActivePower] = useState<PowerMode>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)
  const [selectedPlayer1, setSelectedPlayer1] = useState<string | null>(null)
  const [selectedPlayer2, setSelectedPlayer2] = useState<string | null>(null)
  const [revealedCard, setRevealedCard] = useState<CardType | null>(null)
  const [revealedCards, setRevealedCards] = useState<CardType[]>([])
  const [showPowerChoice, setShowPowerChoice] = useState(false)
  const [showSwapChoice, setShowSwapChoice] = useState(false)
  const [pendingPower, setPendingPower] = useState<string | null>(null)
  const [isRaceMode, setIsRaceMode] = useState(false)
  const [selectingCardToGive, setSelectingCardToGive] = useState(false)
  const [pendingRaceDiscard, setPendingRaceDiscard] = useState<{opponentId: string, cardId: string} | null>(null)
  
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

  const handleDiscardDrawnCard = async (usePower: boolean = true) => {
    if (!drawnCard) return
    
    const response = await fetch('/api/game/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId: drawnCard.id,
        usePower: usePower,
        drawnCardData: drawnCard
      })
    })
    
    const data = await response.json()
    if (data.success && data.shouldActivatePower && data.power) {
      setPendingPower(data.power)
      setShowPowerChoice(true)
    }
    
    setDrawnCard(null)
  }

  const handleSwapWithDrawnCard = async (handCardId: string) => {
    if (!drawnCard) return
    
    const supabase = createClient()
    
    const cardToReplace = myPlayer!.hand.find((c: any) => c && c.id === handCardId)
    if (!cardToReplace) return
    
    const newHand = myPlayer!.hand.map((c: any) => {
      if (c && c.id === handCardId) {
        return {
          ...drawnCard,
          isFaceUp: false,
          position: c.position
        }
      }
      return c
    })
    
    await supabase
      .from('players')
      .update({ hand: newHand })
      .eq('id', my_player_id)
    
    const { data: currentRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    
    if (currentRoom) {
      const newDiscardPile = [...currentRoom.discard_pile, cardToReplace]
      
      let newDeck = currentRoom.deck
      if (newDeck.length === 0 && newDiscardPile.length > 1) {
        const topCard = newDiscardPile[newDiscardPile.length - 1]
        const cardsToShuffle = newDiscardPile.slice(0, -1)
        
        const shuffled = [...cardsToShuffle]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        
        newDeck = shuffled
        await supabase
          .from('game_rooms')
          .update({ 
            deck: newDeck,
            discard_pile: [topCard]
          })
          .eq('id', roomId)
      } else {
        await supabase
          .from('game_rooms')
          .update({ discard_pile: newDiscardPile })
          .eq('id', roomId)
      }
      
      if (cardToReplace.power && cardToReplace.power !== 'wild') {
        setPendingPower(cardToReplace.power)
        setShowPowerChoice(true)
      } else {
        await completeTurn()
      }
    }
    
    setDrawnCard(null)
  }

  const completeTurn = async () => {
    await fetch('/api/game/complete-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    })
  }

  const handleUsePower = (power: string) => {
    setShowPowerChoice(false)
    setPendingPower(null)
    setActivePower(power as PowerMode)
  }

  const handleSkipPower = async () => {
    setShowPowerChoice(false)
    setPendingPower(null)
    await completeTurn()
  }

  const handlePeekOwnCard = async (cardId: string) => {
    const response = await fetch('/api/game/peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: my_player_id,
        cardId
      })
    })
    
    const data = await response.json()
    if (data.success && data.card) {
      setRevealedCard(data.card)
      setTimeout(async () => {
        setRevealedCard(null)
        setActivePower(null)
        await completeTurn()
      }, 3000)
    }
  }

  const handlePeekOpponentCard = async (opponentId: string, cardId: string) => {
    const opponent = players.find(p => p.id === opponentId)
    if (!opponent) return
    
    const card = opponent.hand.find((c: any) => c && c.id === cardId)
    if (card) {
      setRevealedCard(card)
      setTimeout(async () => {
        setRevealedCard(null)
        setActivePower(null)
        await completeTurn()
      }, 3000)
    }
  }

  const handleBlindSwap = async (card1Id: string, card2Id: string, player1Id: string, player2Id: string) => {
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', player1Id).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', player2Id).single()
    
    if (!player1 || !player2) return
    
    const card1 = player1.hand.find((c: any) => c && c.id === card1Id)
    const card2 = player2.hand.find((c: any) => c && c.id === card2Id)
    
    if (!card1 || !card2) return
    
    const newHand1 = player1.hand.map((c: any) => 
      c && c.id === card1Id ? { ...card2, position: card1.position, isFaceUp: false } : c
    )
    
    const newHand2 = player2.hand.map((c: any) => 
      c && c.id === card2Id ? { ...card1, position: card2.position, isFaceUp: false } : c
    )
    
    await supabase.from('players').update({ hand: newHand1 }).eq('id', player1Id)
    await supabase.from('players').update({ hand: newHand2 }).eq('id', player2Id)
    
    setActivePower(null)
    setSelectedCard(null)
    setSelectedOpponent(null)
    setSelectedPlayer1(null)
    setSelectedPlayer2(null)
    await completeTurn()
  }

  const handleSwap = async (card1Id: string, card2Id: string, player1Id: string, player2Id: string) => {
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', player1Id).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', player2Id).single()
    
    if (!player1 || !player2) return
    
    const card1 = player1.hand.find((c: any) => c && c.id === card1Id)
    const card2 = player2.hand.find((c: any) => c && c.id === card2Id)
    
    if (!card1 || !card2) return
    
    // Show both cards
    setRevealedCards([card1, card2])
    setShowSwapChoice(true)
  }

  const handleConfirmSwap = async () => {
    if (!selectedCard || !selectedPlayer1 || !selectedPlayer2) return
    
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', selectedPlayer1).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', selectedPlayer2).single()
    
    if (!player1 || !player2) return
    
    const card1 = player1.hand.find((c: any) => c && c.id === selectedCard)
    const card2 = player2.hand.find((c: any) => c && c.id === revealedCards[1]?.id)
    
    if (!card1 || !card2) return
    
    const newHand1 = player1.hand.map((c: any) => 
      c && c.id === selectedCard ? { ...card2, position: card1.position, isFaceUp: false } : c
    )
    
    const newHand2 = player2.hand.map((c: any) => 
      c && c.id === card2.id ? { ...card1, position: card2.position, isFaceUp: false } : c
    )
    
    await supabase.from('players').update({ hand: newHand1 }).eq('id', selectedPlayer1)
    await supabase.from('players').update({ hand: newHand2 }).eq('id', selectedPlayer2)
    
    setShowSwapChoice(false)
    setRevealedCards([])
    setActivePower(null)
    setSelectedCard(null)
    setSelectedOpponent(null)
    setSelectedPlayer1(null)
    setSelectedPlayer2(null)
    await completeTurn()
  }

  const handleSkipSwap = async () => {
    setShowSwapChoice(false)
    setRevealedCards([])
    setActivePower(null)
    setSelectedCard(null)
    setSelectedOpponent(null)
    setSelectedPlayer1(null)
    setSelectedPlayer2(null)
    await completeTurn()
  }

  const handleRaceDiscard = async (cardId: string) => {
    if (!room) return
    
    const response = await fetch('/api/game/race-discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId: cardId,
        isOpponentCard: false
      })
    })
    
    const data = await response.json()
    setIsRaceMode(false)
    
    if (data.penalty) {
      alert(data.error + ' - Penalty card added!')
    } else if (data.success) {
      console.log('Race discard successful!')
    }
  }

  const handleRaceDiscardOpponent = async (opponentId: string, cardId: string) => {
    if (!room) return
    
    setIsRaceMode(false)
    setSelectingCardToGive(true)
    setPendingRaceDiscard({ opponentId, cardId })
  }

  const handleSelectCardToGive = async (myCardId: string) => {
    if (!pendingRaceDiscard) return
    
    const response = await fetch('/api/game/race-discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id,
        cardId: pendingRaceDiscard.cardId,
        isOpponentCard: true,
        opponentId: pendingRaceDiscard.opponentId,
        cardToGiveId: myCardId
      })
    })
    
    const data = await response.json()
    setSelectingCardToGive(false)
    setPendingRaceDiscard(null)
    
    if (data.penalty) {
      alert(data.error + ' - Penalty card added!')
    } else if (data.success) {
      console.log('Race discard successful!')
    }
  }

  const handleCallCambio = async () => {
    const confirmed = window.confirm('Are you sure you want to call Cambio? Your cards will be frozen!')
    if (!confirmed) return
    
    const response = await fetch('/api/game/call-cambio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId: my_player_id
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      alert(data.error || 'Failed to call Cambio')
    }
  }

  const handleDebugRevealAll = async () => {
    const supabase = createClient()
    for (const player of players) {
      const revealedHand = player.hand.map((c: any) => c ? { ...c, isFaceUp: true } : null)
      await supabase
        .from('players')
        .update({ hand: revealedHand })
        .eq('id', player.id)
    }
  }

  const handleCardClick = (card: any, playerId?: string) => {
    const actualPlayerId = playerId || my_player_id!
    
    if (selectingCardToGive) {
      handleSelectCardToGive(card.id)
    } else if (isRaceMode && actualPlayerId === my_player_id) {
      handleRaceDiscard(card.id)
    } else if (drawnCard && isMyTurn && !activePower) {
      handleSwapWithDrawnCard(card.id)
    } else if (activePower === 'peek_own') {
      handlePeekOwnCard(card.id)
    } else if (activePower === 'blind_swap') {
      // Q and J - blind swap WITHOUT viewing
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(actualPlayerId)
      } else {
        handleBlindSwap(selectedCard, card.id, selectedPlayer1!, actualPlayerId)
      }
    } else if (activePower === 'swap') {
      // Black King - VIEW both cards then choose
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(actualPlayerId)
      } else {
        setSelectedPlayer2(actualPlayerId)
        handleSwap(selectedCard, card.id, selectedPlayer1!, actualPlayerId)
      }
    }
  }

  const handleOpponentCardClick = (opponent: Player, card: any) => {
    if (isRaceMode) {
      handleRaceDiscardOpponent(opponent.id, card.id)
    } else if (activePower === 'peek_opponent') {
      handlePeekOpponentCard(opponent.id, card.id)
    } else if (activePower === 'blind_swap') {
      // Q and J - blind swap WITHOUT viewing
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(opponent.id)
      } else {
        handleBlindSwap(selectedCard, card.id, selectedPlayer1!, opponent.id)
      }
    } else if (activePower === 'swap') {
      // Black King - VIEW both cards then choose
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(opponent.id)
      } else {
        setSelectedPlayer2(opponent.id)
        handleSwap(selectedCard, card.id, selectedPlayer1!, opponent.id)
      }
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

  const getPowerDescription = (power: string) => {
    switch(power) {
      case 'peek_own': return 'Peek at one of your own cards'
      case 'peek_opponent': return 'Peek at an opponent\'s card'
      case 'swap': return 'View ANY two cards and choose whether to swap them (Black King only)'
      case 'blind_swap': return 'Blind swap: swap any two cards WITHOUT looking (Q or J)'
      default: return 'Use card power'
    }
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

        {/* Power Choice Modal */}
        {showPowerChoice && pendingPower && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 border-2 border-yellow-500 max-w-md">
              <h3 className="text-white text-2xl font-bold mb-4 text-center">⚡ Card Power Available!</h3>
              <p className="text-slate-300 text-center mb-6">
                {getPowerDescription(pendingPower)}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleUsePower(pendingPower)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg font-bold text-lg"
                >
                  ⚡ Use Power
                </button>
                <button
                  onClick={handleSkipPower}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-bold"
                >
                  Skip Power
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Swap Choice Modal (Black King Only) */}
        {showSwapChoice && revealedCards.length === 2 && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 border-2 border-blue-500 max-w-2xl">
              <h3 className="text-white text-2xl font-bold mb-4 text-center">View Cards & Choose (Black King Power)</h3>
              <div className="flex justify-center gap-8 mb-6">
                {revealedCards.map((card, index) => (
                  <div key={index}>
                    <p className="text-white text-center mb-2">Card {index + 1}</p>
                    <div className="w-32 h-48">
                      <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                        <div className="text-xl font-bold" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                          <div>{card.rank}</div>
                          <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center text-4xl" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                          {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleConfirmSwap}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-lg"
                >
                  ✅ Swap These Cards
                </button>
                <button
                  onClick={handleSkipSwap}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-bold"
                >
                  ❌ Don't Swap
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Power Instructions */}
        {activePower && !showSwapChoice && (
          <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-yellow-600 text-black px-6 py-4 rounded-lg shadow-2xl border-4 border-yellow-400">
            <p className="font-bold text-lg text-center">
              {activePower === 'peek_own' && '👆 Click one of YOUR cards to peek at it'}
              {activePower === 'peek_opponent' && '👆 Click an OPPONENT\'S card to peek at it'}
              {activePower === 'blind_swap' && !selectedCard && '👆 Click the FIRST card to swap (Q/J - NO PEEKING!)'}
              {activePower === 'blind_swap' && selectedCard && '👆 Click the SECOND card to complete blind swap'}
              {activePower === 'swap' && !selectedCard && '👆 Click the FIRST card (Black King - you\'ll see both!)'}
              {activePower === 'swap' && selectedCard && '👆 Click the SECOND card to view both and decide'}
            </p>
          </div>
        )}

        {/* Race Mode Instructions */}
        {isRaceMode && room.discard_pile.length > 0 && (
          <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl border-4 border-red-400">
            <p className="font-bold text-lg text-center">
              ⚡ RACE DISCARD MODE: Click ANY card (yours or opponent's) to discard it!
            </p>
            <p className="text-sm text-center mt-2">
              Top card: {room.discard_pile[room.discard_pile.length - 1]?.rank} (Match this rank!)
            </p>
            <p className="text-xs text-center mt-2 text-yellow-300">
              If you discard someone else's card, you'll choose which card to give them!
            </p>
          </div>
        )}

        {/* Select Card to Give Instructions */}
        {selectingCardToGive && (
          <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl border-4 border-blue-400">
            <p className="font-bold text-lg text-center">
              👆 Choose ONE of YOUR cards to give to the opponent
            </p>
            <p className="text-sm text-center mt-2">
              Click a card from your hand
            </p>
            <button
              onClick={() => {
                setSelectingCardToGive(false)
                setPendingRaceDiscard(null)
              }}
              className="w-full mt-3 bg-gray-700 hover:bg-gray-800 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        )}

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
            </div>

            {/* Revealed Card Modal */}
            {revealedCard && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
                  <h3 className="text-white text-xl mb-4">Card Revealed!</h3>
                  <div className="flex justify-center">
                    <div className="w-32 h-48">
                      <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                        <div className="text-xl font-bold" style={{ color: revealedCard.suit === 'hearts' || revealedCard.suit === 'diamonds' ? 'red' : 'black' }}>
                          <div>{revealedCard.rank}</div>
                          <div>{revealedCard.suit === 'hearts' ? '♥' : revealedCard.suit === 'diamonds' ? '♦' : revealedCard.suit === 'clubs' ? '♣' : '♠'}</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center text-4xl" style={{ color: revealedCard.suit === 'hearts' || revealedCard.suit === 'diamonds' ? 'red' : 'black' }}>
                          {revealedCard.suit === 'hearts' ? '♥' : revealedCard.suit === 'diamonds' ? '♦' : revealedCard.suit === 'clubs' ? '♣' : '♠'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Drawn Card Display */}
            {drawnCard && isMyTurn && !activePower && (
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
                <div className="space-y-2">
                  <button
                    onClick={() => handleDiscardDrawnCard(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold"
                  >
                    Discard This Card
                  </button>
                  <p className="text-slate-400 text-sm text-center">OR</p>
                  <p className="text-slate-300 text-sm text-center">Click a card in your hand to swap</p>
                </div>
              </div>
            )}

            {/* Race-to-Discard Button */}
            {room.discard_pile.length > 0 && !selectingCardToGive && (
              <div className="fixed bottom-1/3 left-8 z-40">
                {!isRaceMode ? (
                  <button
                    onClick={() => setIsRaceMode(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-2xl border-2 border-red-400"
                  >
                    ⚡ RACE DISCARD
                  </button>
                ) : (
                  <div className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-2xl border-2 border-red-400">
                    <p className="text-center mb-2">👆 Click ANY card to discard</p>
                    <button
                      onClick={() => setIsRaceMode(false)}
                      className="w-full bg-gray-700 hover:bg-gray-800 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-6 mb-8">
              {players
                .filter(p => p.id !== my_player_id)
                .map(opponent => (
                  <div 
                    key={opponent.id}
                    className={(activePower || isRaceMode) ? 'cursor-pointer' : ''}
                  >
                    <OpponentHand 
                      player={opponent}
                      onCardClick={(card) => handleOpponentCardClick(opponent, card)}
                      clickable={!!activePower || isRaceMode}
                    />
                  </div>
                ))}
            </div>

            <div className="flex justify-center gap-8 mb-16">
              <Deck 
                cardCount={room.deck.length}
                onDraw={handleDrawDeck}
                canDraw={isMyTurn && !drawnCard && !activePower && !isFrozen && !selectingCardToGive}
              />
              <DiscardPile 
                cards={room.discard_pile}
                onDraw={handleDrawDiscard}
                canDraw={isMyTurn && !drawnCard && !activePower && !isFrozen && room.discard_pile.length > 0 && !selectingCardToGive}
              />
            </div>

            {/* Game Controls */}
            {isMyTurn && !isFrozen && !activePower && !selectingCardToGive && (
              <div className="fixed top-24 right-8 bg-slate-800 rounded-lg shadow-lg p-4 space-y-3 min-w-[200px] border border-slate-700">
                <h3 className="font-bold text-lg text-white">Your Turn</h3>
                
                {!drawnCard && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">Draw a card{!isCambioPhase && ' or call Cambio'}</p>
                    {!isCambioPhase && (
                      <button
                        onClick={handleCallCambio}
                        className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 font-bold"
                      >
                        🔔 Call Cambio!
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="fixed bottom-8 right-8">
              <PlayerHand
                cards={myPlayer.hand}
                isMyTurn={!!isMyTurn && !isFrozen}
                onCardClick={(card) => handleCardClick(card, my_player_id)}
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