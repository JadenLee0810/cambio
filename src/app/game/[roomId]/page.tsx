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
  const [selectedCard1Id, setSelectedCard1Id] = useState<string | null>(null)
  const [selectedCard2Id, setSelectedCard2Id] = useState<string | null>(null)
  const [revealedCard, setRevealedCard] = useState<CardType | null>(null)
  const [revealedCards, setRevealedCards] = useState<CardType[]>([])
  const [showPowerChoice, setShowPowerChoice] = useState(false)
  const [showSwapChoice, setShowSwapChoice] = useState(false)
  const [pendingPower, setPendingPower] = useState<string | null>(null)
  const [isRaceMode, setIsRaceMode] = useState(false)
  const [selectingCardToGive, setSelectingCardToGive] = useState(false)
  const [pendingRaceDiscard, setPendingRaceDiscard] = useState<{opponentId: string, cardId: string} | null>(null)
  const [myLastTurnIndex, setMyLastTurnIndex] = useState<number | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  
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

  // Reset hasDrawn when turn changes to my turn
  useEffect(() => {
    if (room && myPlayer) {
      const isMyTurn = room.current_turn === myPlayer.player_index
      if (isMyTurn) {
        setHasDrawn(false)
      }
    }
  }, [room?.current_turn, myPlayer?.player_index])

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
    setHasDrawn(true)
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
    setHasDrawn(true)
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
    setDrawnCard(null)
    
    if (data.success && data.shouldActivatePower && data.power) {
      setPendingPower(data.power)
      setShowPowerChoice(true)
    } else {
      // Auto end turn
      await completeTurn()
    }
  }

  const handleAddDrawnCard = async () => {
    if (!drawnCard) return
    
    const supabase = createClient()
    
    // Add the drawn card to hand
    const newHand = [...myPlayer!.hand, {
      ...drawnCard,
      isFaceUp: false,
      position: myPlayer!.hand.length
    }]
    
    await supabase
      .from('players')
      .update({ hand: newHand })
      .eq('id', my_player_id)
    
    setDrawnCard(null)
    
    // DO NOT activate power when adding to hand - just end turn
    await completeTurn()
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
      
      const replacedCardPower = cardToReplace.power
      setDrawnCard(null)
      
      if (replacedCardPower && replacedCardPower !== 'wild') {
        // Map card power to game power mode
        let gamePower = replacedCardPower
        if (replacedCardPower === 'black_king') {
          gamePower = 'blind_swap'
        }
        setPendingPower(gamePower)
        setShowPowerChoice(true)
      } else {
        // Auto end turn
        await completeTurn()
      }
    }
  }

  const completeTurn = async () => {
    if (myPlayer) {
      setMyLastTurnIndex(myPlayer.player_index)
    }
    
    await fetch('/api/game/complete-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId })
    })
    setHasDrawn(false)
  }

  const handleUsePower = (power: string) => {
    setShowPowerChoice(false)
    setPendingPower(null)
    setActivePower(power as PowerMode)
  }

  const handleSkipPower = async () => {
    setShowPowerChoice(false)
    setPendingPower(null)
    // Auto end turn after skipping power
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
    
    if (!response.ok || !data.success) {
      // Card was removed (probably by race discard)
      alert('That card is no longer available!')
      setActivePower(null)
      await completeTurn()
      return
    }
    
    if (data.success && data.card) {
      setRevealedCard(data.card)
      setTimeout(async () => {
        setRevealedCard(null)
        setActivePower(null)
        // Auto end turn after peek
        await completeTurn()
      }, 3000)
    }
  }

  const handlePeekOpponentCard = async (opponentId: string, cardId: string) => {
    const opponent = players.find(p => p.id === opponentId)
    if (!opponent) {
      alert('Player not found!')
      setActivePower(null)
      await completeTurn()
      return
    }
    
    const card = opponent.hand.find((c: any) => c && c.id === cardId)
    if (!card) {
      // Card was removed (probably by race discard)
      alert('That card is no longer available!')
      setActivePower(null)
      await completeTurn()
      return
    }
    
    setRevealedCard(card)
    setTimeout(async () => {
      setRevealedCard(null)
      setActivePower(null)
      // Auto end turn after peek
      await completeTurn()
    }, 3000)
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
    
    // Auto end turn after blind swap
    await completeTurn()
  }

  const handleSwap = async (card1Id: string, card2Id: string, player1Id: string, player2Id: string) => {
    console.log('=== BLACK KING SWAP START ===')
    console.log('Input params:', { card1Id, card2Id, player1Id, player2Id })
    
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', player1Id).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', player2Id).single()
    
    console.log('Players fetched:', { 
      player1: player1?.username, 
      player2: player2?.username,
      player1Hand: player1?.hand,
      player2Hand: player2?.hand
    })
    
    if (!player1 || !player2) {
      console.error('ERROR: Players not found!')
      return
    }
    
    const card1 = player1.hand.find((c: any) => c && c.id === card1Id)
    const card2 = player2.hand.find((c: any) => c && c.id === card2Id)
    
    console.log('Cards found:', { 
      card1: card1 ? `${card1.rank} of ${card1.suit}` : 'NOT FOUND',
      card2: card2 ? `${card2.rank} of ${card2.suit}` : 'NOT FOUND'
    })
    
    if (!card1 || !card2) {
      console.error('ERROR: Cards not found in hands!')
      console.log('Looking for card1 ID:', card1Id, 'in player1 hand:', player1.hand.map((c: any) => c?.id))
      console.log('Looking for card2 ID:', card2Id, 'in player2 hand:', player2.hand.map((c: any) => c?.id))
      return
    }
    
    // Store the actual card IDs from the hands
    setSelectedCard1Id(card1.id)
    setSelectedCard2Id(card2.id)
    
    console.log('Setting revealed cards and showing modal')
    console.log('Revealed cards:', [card1, card2])
    
    // Show both cards for Black King
    setRevealedCards([card1, card2])
    setShowSwapChoice(true)
    
    console.log('=== BLACK KING SWAP SETUP COMPLETE ===')
  }

  const handleConfirmSwap = async () => {
    console.log('=== CONFIRM SWAP START ===')
    console.log('State:', { 
      selectedCard1Id, 
      selectedCard2Id, 
      selectedPlayer1, 
      selectedPlayer2,
      revealedCards: revealedCards.length
    })
    
    if (!selectedCard1Id || !selectedCard2Id) {
      console.error('ERROR: Card IDs not set!')
      return
    }
    
    if (!selectedPlayer1 || !selectedPlayer2) {
      console.error('ERROR: Player IDs not set!')
      return
    }
    
    if (revealedCards.length !== 2) {
      console.error('ERROR: Not exactly 2 revealed cards!', revealedCards.length)
      return
    }
    
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', selectedPlayer1).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', selectedPlayer2).single()
    
    console.log('Players re-fetched:', { 
      player1: player1?.username, 
      player2: player2?.username 
    })
    
    if (!player1 || !player2) {
      console.error('ERROR: Failed to re-fetch players!')
      return
    }
    
    const card1 = player1.hand.find((c: any) => c && c.id === selectedCard1Id)
    const card2 = player2.hand.find((c: any) => c && c.id === selectedCard2Id)
    
    console.log('Cards found in current hands:', { 
      card1: card1 ? `${card1.rank} of ${card1.suit}` : 'NOT FOUND',
      card2: card2 ? `${card2.rank} of ${card2.suit}` : 'NOT FOUND'
    })
    
    if (!card1 || !card2) {
      console.error('ERROR: Cards not found in current hands!')
      console.log('Player1 hand IDs:', player1.hand.map((c: any) => c?.id))
      console.log('Player2 hand IDs:', player2.hand.map((c: any) => c?.id))
      return
    }
    
    const newHand1 = player1.hand.map((c: any) => {
      if (c && c.id === selectedCard1Id) {
        console.log('Replacing card1 with card2')
        return { ...card2, position: card1.position, isFaceUp: false }
      }
      return c
    })
    
    const newHand2 = player2.hand.map((c: any) => {
      if (c && c.id === selectedCard2Id) {
        console.log('Replacing card2 with card1')
        return { ...card1, position: card2.position, isFaceUp: false }
      }
      return c
    })
    
    console.log('New hands created, updating database...')
    
    await supabase.from('players').update({ hand: newHand1 }).eq('id', selectedPlayer1)
    await supabase.from('players').update({ hand: newHand2 }).eq('id', selectedPlayer2)
    
    console.log('Database updated successfully!')
    
    setShowSwapChoice(false)
    setRevealedCards([])
    setActivePower(null)
    setSelectedCard(null)
    setSelectedOpponent(null)
    setSelectedPlayer1(null)
    setSelectedPlayer2(null)
    setSelectedCard1Id(null)
    setSelectedCard2Id(null)
    
    console.log('=== CONFIRM SWAP COMPLETE ===')
    
    // Auto end turn after swap
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
    setSelectedCard1Id(null)
    setSelectedCard2Id(null)
    
    // Auto end turn after declining swap
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
    } else {
      setMyLastTurnIndex(null)
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
    
    console.log('=== CARD CLICKED ===')
    console.log('Card:', card)
    console.log('Player ID:', actualPlayerId)
    console.log('Current state:', {
      selectingCardToGive,
      isRaceMode,
      drawnCard: !!drawnCard,
      isMyTurn,
      activePower,
      selectedCard
    })
    
    // Race discard and card selection should work regardless of turn
    if (selectingCardToGive) {
      console.log('Action: Selecting card to give')
      handleSelectCardToGive(card.id)
      return
    }
    
    if (isRaceMode && actualPlayerId === my_player_id) {
      console.log('Action: Race discard')
      handleRaceDiscard(card.id)
      return
    }
    
    // Regular turn actions
    if (drawnCard && isMyTurn && !activePower) {
      console.log('Action: Swap with drawn card')
      handleSwapWithDrawnCard(card.id)
    } else if (activePower === 'peek_own') {
      console.log('Action: Peek own card')
      handlePeekOwnCard(card.id)
    } else if (activePower === 'swap') {
      // Jack/Queen - blind swap WITHOUT viewing
      if (!selectedCard) {
        console.log('Action: Selecting FIRST card for blind swap')
        setSelectedCard(card.id)
        setSelectedPlayer1(actualPlayerId)
      } else {
        console.log('Action: Selecting SECOND card for blind swap - calling handleBlindSwap')
        handleBlindSwap(selectedCard, card.id, selectedPlayer1!, actualPlayerId)
      }
    } else if (activePower === 'blind_swap') {
      // Black King - VIEW both cards then choose
      if (!selectedCard) {
        console.log('Action: Selecting FIRST card for Black King swap')
        setSelectedCard(card.id)
        setSelectedPlayer1(actualPlayerId)
      } else {
        console.log('Action: Selecting SECOND card for Black King swap - calling handleSwap')
        setSelectedPlayer2(actualPlayerId)
        handleSwap(selectedCard, card.id, selectedPlayer1!, actualPlayerId)
      }
    } else {
      console.log('Action: NONE - no matching condition')
    }
  }

  const handleOpponentCardClick = (opponent: Player, card: any) => {
    console.log('=== OPPONENT CARD CLICKED ===')
    console.log('Opponent:', opponent.username)
    console.log('Card:', card)
    console.log('Current state:', {
      isRaceMode,
      activePower,
      selectedCard
    })
    
    if (isRaceMode) {
      console.log('Action: Race discard opponent')
      handleRaceDiscardOpponent(opponent.id, card.id)
    } else if (activePower === 'peek_opponent') {
      console.log('Action: Peek opponent card')
      handlePeekOpponentCard(opponent.id, card.id)
    } else if (activePower === 'swap') {
      // Jack/Queen - blind swap WITHOUT viewing
      if (!selectedCard) {
        console.log('Action: Selecting FIRST opponent card for blind swap')
        setSelectedCard(card.id)
        setSelectedPlayer1(opponent.id)
      } else {
        console.log('Action: Selecting SECOND opponent card for blind swap - calling handleBlindSwap')
        handleBlindSwap(selectedCard, card.id, selectedPlayer1!, opponent.id)
      }
    } else if (activePower === 'blind_swap') {
      // Black King - VIEW both cards then choose
      if (!selectedCard) {
        console.log('Action: Selecting FIRST opponent card for Black King swap')
        setSelectedCard(card.id)
        setSelectedPlayer1(opponent.id)
      } else {
        console.log('Action: Selecting SECOND opponent card for Black King swap - calling handleSwap')
        setSelectedPlayer2(opponent.id)
        handleSwap(selectedCard, card.id, selectedPlayer1!, opponent.id)
      }
    } else {
      console.log('Action: NONE - no matching condition')
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

  // Can call Cambio only during the next player's turn after I ended my turn
  const myIndex = myPlayer?.player_index ?? -1
  const nextPlayerIndex = (myIndex + 1) % players.length
  const isNextPlayerTurn = room.current_turn === nextPlayerIndex
  const canCallCambio = myLastTurnIndex === myIndex && isNextPlayerTurn && !isCambioPhase && !isFrozen

  if (room && room.status !== 'playing' && room.status !== 'finished') {
    router.push(`/waiting/${roomId}`)
    return null
  }

  const getPowerDescription = (power: string) => {
    switch(power) {
      case 'peek_own': return 'Peek at one of your own cards'
      case 'peek_opponent': return 'Peek at an opponent\'s card'
      case 'swap': return 'Blind swap any two cards WITHOUT looking (Q or J)'
      case 'blind_swap': return 'View ANY two cards and choose whether to swap them (Black King only)'
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
                <>
                  <button
                    onClick={handleDebugRevealAll}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-bold text-sm"
                  >
                    🐛 DEBUG: Reveal All
                  </button>
                  <button
                    onClick={() => {
                      console.log('=== DEBUG STATE ===');
                      console.log('showSwapChoice:', showSwapChoice);
                      console.log('revealedCards:', revealedCards);
                      console.log('selectedCard1Id:', selectedCard1Id);
                      console.log('selectedCard2Id:', selectedCard2Id);
                      console.log('selectedPlayer1:', selectedPlayer1);
                      console.log('selectedPlayer2:', selectedPlayer2);
                      console.log('activePower:', activePower);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 font-bold text-sm"
                  >
                    🐛 DEBUG: State
                  </button>
                </>
              )}
              
              {isCambioPhase && (
                <div className="bg-yellow-600 text-white px-3 py-1 rounded font-bold">
                  🔔 CAMBIO CALLED!
                </div>
              )}
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
              {activePower === 'swap' && !selectedCard && '👆 Click the FIRST card to swap (Q/J - NO PEEKING!)'}
              {activePower === 'swap' && selectedCard && '👆 Click the SECOND card to complete blind swap'}
              {activePower === 'blind_swap' && !selectedCard && '👆 Click the FIRST card (Black King - you\'ll see both!)'}
              {activePower === 'blind_swap' && selectedCard && '👆 Click the SECOND card to view both and decide'}
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
              <div className="grid grid-cols-2 gap-4">
                {myPlayer.hand.map((card: any, index: number) => {
                  // Bottom 2 cards are face up (indices 2 and 3 in a 4-card hand)
                  const isFaceUp = index >= myPlayer.hand.length - 2
                  
                  return (
                    <div key={index} className="w-32 h-48">
                      {isFaceUp ? (
                        <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-2 flex flex-col">
                          <div className="text-xl font-bold" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                            <div>{card.rank}</div>
                            <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                          </div>
                          <div className="flex-1 flex items-center justify-center text-4xl" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                            {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-red-600 rounded-lg border-4 border-white shadow-lg flex items-center justify-center">
                          <span className="text-white font-bold text-2xl transform -rotate-45">CAMBIO</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
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
                    onClick={handleAddDrawnCard}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold"
                  >
                    Add to Hand
                  </button>
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

            {/* Race-to-Discard Button - Always available */}
            {!selectingCardToGive && (
              <div className="fixed bottom-1/3 left-8 z-40">
                {!isRaceMode ? (
                  <button
                    onClick={() => setIsRaceMode(true)}
                    disabled={room.discard_pile.length === 0}
                    className={`px-6 py-3 rounded-lg font-bold text-lg shadow-2xl border-2 ${
                      room.discard_pile.length === 0
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-500'
                        : 'bg-red-600 hover:bg-red-700 text-white border-red-400'
                    }`}
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
                canDraw={isMyTurn && !drawnCard && !activePower && !isFrozen && !selectingCardToGive && !hasDrawn}
              />
              <DiscardPile 
                cards={room.discard_pile}
                onDraw={handleDrawDiscard}
                canDraw={isMyTurn && !drawnCard && !activePower && !isFrozen && room.discard_pile.length > 0 && !selectingCardToGive && !hasDrawn}
              />
            </div>

            {/* Call Cambio Button - Only visible during next player's turn */}
            {canCallCambio && (
              <div className="fixed top-24 right-8 bg-yellow-600 rounded-lg shadow-lg p-4 space-y-3 min-w-[200px] border-2 border-yellow-400">
                <h3 className="font-bold text-lg text-black text-center">Call Cambio?</h3>
                <button
                  onClick={handleCallCambio}
                  className="w-full bg-black text-yellow-400 py-3 rounded hover:bg-gray-900 font-bold text-lg"
                >
                  🔔 Call Cambio!
                </button>
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
            <div className="bg-slate-800 rounded-lg shadow-lg p-8 max-w-4xl mx-auto border border-slate-700">
              <h3 className="text-2xl font-bold mb-6 text-white">Final Scores</h3>
              <div className="space-y-6">
                {[...players]
                  .sort((a, b) => a.score - b.score)
                  .map((player, index) => (
                    <div key={player.id}>
                      <div
                        className={`p-4 rounded-lg ${
                          index === 0 ? 'bg-yellow-900/30 border-2 border-yellow-600' : 'bg-slate-700 border border-slate-600'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-lg text-white">
                            {index === 0 && '👑 '}
                            {player.username}
                            {player.id === my_player_id && ' (You)'}
                            {player.id === room.cambio_caller_id && ' (Called Cambio)'}
                          </span>
                          <span className="text-2xl font-bold text-white">{player.score} pts</span>
                        </div>
                        
                        {/* Show player's cards */}
                        <div className="flex justify-center gap-2 flex-wrap">
                          {player.hand.map((card: any, cardIndex: number) => (
                            card && (
                              <div key={cardIndex} className="w-16 h-24">
                                <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg p-1 flex flex-col">
                                  <div className="text-sm font-bold" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                                    <div>{card.rank}</div>
                                    <div>{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</div>
                                  </div>
                                  <div className="flex-1 flex items-center justify-center text-2xl" style={{ color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black' }}>
                                    {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                                  </div>
                                </div>
                              </div>
                            )
                          ))}
                        </div>
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