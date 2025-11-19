'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { createClient } from '@/lib/supabase/client'
import { PlayerHand } from '@/components/game/PlayerHand/PlayerHand'
import { OpponentHand } from '@/components/game/PlayerHand/OpponentHand'
import { Deck } from '@/components/game/Deck/Deck'
import { DiscardPile } from '@/components/game/Deck/DiscardPile'
import { Chat } from '@/components/game/Chat/Chat'
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
  const [pendingPowerCard, setPendingPowerCard] = useState<CardType | null>(null)
  const [selectingCardToGive, setSelectingCardToGive] = useState(false)
  const [pendingRaceDiscard, setPendingRaceDiscard] = useState<{opponentId: string, cardId: string} | null>(null)
  const [myLastTurnIndex, setMyLastTurnIndex] = useState<number | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [cambioCaller, setCambioCaller] = useState<string | null>(null)
  const [showCambioPopup, setShowCambioPopup] = useState(false)
  const [showTip, setShowTip] = useState(true)
  
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

  useEffect(() => {
    if (room && myPlayer) {
      const isMyTurn = room.current_turn === myPlayer.player_index
      if (isMyTurn) {
        setHasDrawn(false)
      }
    }
  }, [room?.current_turn, myPlayer?.player_index])

  useEffect(() => {
    if (room?.cambio_caller_id && room.cambio_caller_id !== cambioCaller) {
      const caller = players.find(p => p.id === room.cambio_caller_id)
      if (caller) {
        setCambioCaller(room.cambio_caller_id)
        setShowCambioPopup(true)
        
        setTimeout(() => {
          setShowCambioPopup(false)
        }, 3000)
      }
    }
  }, [room?.cambio_caller_id, players, cambioCaller])

  // Check if game should end when it's Cambio caller's turn again
  useEffect(() => {
    const checkGameEnd = async () => {
      if (room?.cambio_caller_id && room.game_phase === 'playing' && room.status === 'playing') {
        const cambioCallerPlayer = players.find(p => p.id === room.cambio_caller_id)
        if (cambioCallerPlayer && room.current_turn === cambioCallerPlayer.player_index) {
          console.log('🔚 Game ending - Cambio caller turn again')
          await fetch('/api/game/end-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId })
          })
        }
      }
    }
    
    checkGameEnd()
  }, [room?.current_turn, room?.cambio_caller_id, room?.game_phase, room?.status, players, roomId])

  const setHighlightedCardForAll = async (cardId: string | null, playerId: string | null = null) => {
    const supabase = createClient()
    await supabase
      .from('game_rooms')
      .update({ 
        highlighted_card_id: cardId,
        highlighted_player_id: playerId 
      })
      .eq('id', roomId)
  }

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
    
    if (data.success && data.shouldActivatePower && data.power) {
      setPendingPower(data.power)
      setPendingPowerCard(drawnCard)
      setShowPowerChoice(true)
    } else {
      setPendingPowerCard(null)
      await completeTurn()
    }
    
    setDrawnCard(null)
  }

  const handleAddDrawnCard = async () => {
    if (!drawnCard) return
    
    const supabase = createClient()
    
    const hand = [...myPlayer!.hand]
    const firstNullIndex = hand.findIndex(c => c === null)
    
    if (firstNullIndex !== -1) {
      hand[firstNullIndex] = {
        ...drawnCard,
        isFaceUp: false,
        position: firstNullIndex
      }
    } else {
      hand.push({
        ...drawnCard,
        isFaceUp: false,
        position: hand.length
      })
    }
    
    await supabase
      .from('players')
      .update({ hand })
      .eq('id', my_player_id)
    
    setDrawnCard(null)
    
    await setHighlightedCardForAll(drawnCard.id, my_player_id)
    setTimeout(async () => {
      await setHighlightedCardForAll(null)
    }, 2000)
    
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
    
    await setHighlightedCardForAll(drawnCard.id, my_player_id)
    
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
      
      setTimeout(async () => {
        await setHighlightedCardForAll(null)
      }, 2000)
      
      if (replacedCardPower && replacedCardPower !== 'wild') {
        let gamePower = replacedCardPower
        if (replacedCardPower === 'black_king') {
          gamePower = 'blind_swap'
        }
        setPendingPower(gamePower)
        setPendingPowerCard(cardToReplace)
        setShowPowerChoice(true)
      } else {
        setPendingPowerCard(null)
        await completeTurn()
      }
    }
    
    setDrawnCard(null)
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
    setPendingPowerCard(null)
    setActivePower(power as PowerMode)
  }

  const handleSkipPower = async () => {
    setShowPowerChoice(false)
    setPendingPower(null)
    setPendingPowerCard(null)
    await completeTurn()
  }

  const handlePeekOwnCard = async (cardId: string) => {
    await setHighlightedCardForAll(cardId, my_player_id)
    
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
      alert('That card is no longer available!')
      setActivePower(null)
      await setHighlightedCardForAll(null)
      await completeTurn()
      return
    }
    
    if (data.success && data.card) {
      setRevealedCard(data.card)
      setTimeout(async () => {
        setRevealedCard(null)
        setActivePower(null)
        await setHighlightedCardForAll(null)
        await completeTurn()
      }, 3000)
    }
  }

  const handlePeekOpponentCard = async (opponentId: string, cardId: string) => {
    await setHighlightedCardForAll(cardId, opponentId)
    
    const opponent = players.find(p => p.id === opponentId)
    if (!opponent) {
      alert('Player not found!')
      setActivePower(null)
      await setHighlightedCardForAll(null)
      await completeTurn()
      return
    }
    
    const card = opponent.hand.find((c: any) => c && c.id === cardId)
    if (!card) {
      alert('That card is no longer available!')
      setActivePower(null)
      await setHighlightedCardForAll(null)
      await completeTurn()
      return
    }
    
    setRevealedCard(card)
    setTimeout(async () => {
      setRevealedCard(null)
      setActivePower(null)
      await setHighlightedCardForAll(null)
      await completeTurn()
    }, 3000)
  }

  const handleBlindSwap = async (card1Id: string, card2Id: string, player1Id: string, player2Id: string) => {
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', player1Id).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', player2Id).single()
    
    if (!player1 || !player2) return
    
    const card1Index = player1.hand.findIndex((c: any) => c && c.id === card1Id)
    const card2Index = player2.hand.findIndex((c: any) => c && c.id === card2Id)
    
    if (card1Index === -1 || card2Index === -1) return
    
    const card1 = player1.hand[card1Index]
    const card2 = player2.hand[card2Index]
    
    if (!card1 || !card2) return
    
    const newHand1 = [...player1.hand]
    newHand1[card1Index] = { ...card2, position: card1.position, isFaceUp: false }
    
    const newHand2 = [...player2.hand]
    newHand2[card2Index] = { ...card1, position: card2.position, isFaceUp: false }
    
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
    
    setSelectedCard1Id(card1.id)
    setSelectedCard2Id(card2.id)
    
    setRevealedCards([card1, card2])
    setShowSwapChoice(true)
  }

  const handleConfirmSwap = async () => {
    if (!selectedCard1Id || !selectedCard2Id) return
    if (!selectedPlayer1 || !selectedPlayer2) return
    if (revealedCards.length !== 2) return
    
    const supabase = createClient()
    
    const { data: player1 } = await supabase.from('players').select('*').eq('id', selectedPlayer1).single()
    const { data: player2 } = await supabase.from('players').select('*').eq('id', selectedPlayer2).single()
    
    if (!player1 || !player2) return
    
    const card1 = player1.hand.find((c: any) => c && c.id === selectedCard1Id)
    const card2 = player2.hand.find((c: any) => c && c.id === selectedCard2Id)
    
    if (!card1 || !card2) return
    
    const newHand1 = player1.hand.map((c: any) => {
      if (c && c.id === selectedCard1Id) {
        return { ...card2, position: card1.position, isFaceUp: false }
      }
      return c
    })
    
    const newHand2 = player2.hand.map((c: any) => {
      if (c && c.id === selectedCard2Id) {
        return { ...card1, position: card2.position, isFaceUp: false }
      }
      return c
    })
    
    await supabase.from('players').update({ hand: newHand1 }).eq('id', selectedPlayer1)
    await supabase.from('players').update({ hand: newHand2 }).eq('id', selectedPlayer2)
    
    setShowSwapChoice(false)
    setRevealedCards([])
    setActivePower(null)
    setSelectedCard(null)
    setSelectedOpponent(null)
    setSelectedPlayer1(null)
    setSelectedPlayer2(null)
    setSelectedCard1Id(null)
    setSelectedCard2Id(null)
    
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
    
    if (data.penalty) {
      alert(data.error)
    } else if (data.success) {
      console.log('Race discard successful!')
    }
  }

  const handleRaceDiscardOpponent = async (opponentId: string, cardId: string) => {
    if (!room) return
    
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
      alert(data.error)
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

  const handleCardClick = (card: any, playerId?: string, isShiftClick: boolean = false) => {
    const actualPlayerId = playerId || my_player_id!
    
    // Shift+Click = Race Discard (always available)
    if (isShiftClick && actualPlayerId === my_player_id) {
      handleRaceDiscard(card.id)
      return
    }
    
    if (selectingCardToGive) {
      handleSelectCardToGive(card.id)
      return
    }
    
    if (drawnCard && isMyTurn && !activePower) {
      handleSwapWithDrawnCard(card.id)
    } else if (activePower === 'peek_own') {
      handlePeekOwnCard(card.id)
    } else if (activePower === 'swap') {
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(actualPlayerId)
        setHighlightedCardForAll(card.id, actualPlayerId)
      } else {
        setHighlightedCardForAll(null)
        handleBlindSwap(selectedCard, card.id, selectedPlayer1!, actualPlayerId)
      }
    } else if (activePower === 'blind_swap') {
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(actualPlayerId)
        setHighlightedCardForAll(card.id, actualPlayerId)
      } else {
        setSelectedPlayer2(actualPlayerId)
        handleSwap(selectedCard, card.id, selectedPlayer1!, actualPlayerId)
      }
    }
  }

  const handleOpponentCardClick = (opponent: Player, card: any, isShiftClick: boolean = false) => {
    // Shift+Click = Race Discard (always available)
    if (isShiftClick) {
      handleRaceDiscardOpponent(opponent.id, card.id)
      return
    }
    
    if (activePower === 'peek_opponent') {
      handlePeekOpponentCard(opponent.id, card.id)
    } else if (activePower === 'swap') {
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(opponent.id)
        setHighlightedCardForAll(card.id, opponent.id)
      } else {
        setHighlightedCardForAll(null)
        handleBlindSwap(selectedCard, card.id, selectedPlayer1!, opponent.id)
      }
    } else if (activePower === 'blind_swap') {
      if (!selectedCard) {
        setSelectedCard(card.id)
        setSelectedPlayer1(opponent.id)
        setHighlightedCardForAll(card.id, opponent.id)
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
            </div>
          </div>
        </div>

        {/* Shift+Click Instructions */}
        {isActualGame && room.discard_pile.length > 0 && showTip && (
          <div 
            className="fixed top-20 right-8 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-red-400 text-sm z-30 cursor-pointer hover:bg-red-700 transition-colors"
            onClick={() => setShowTip(false)}
            title="Click to dismiss"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-bold">💡 Tip: Shift+Click any card to race discard!</p>
                <p className="text-xs mt-1">Match the rank: {room.discard_pile[room.discard_pile.length - 1]?.rank}</p>
              </div>
              <button 
                className="text-white hover:text-gray-200 font-bold text-xl leading-none"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTip(false)
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Cambio Called Popup */}
        {showCambioPopup && room?.cambio_caller_id && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-12 border-8 border-yellow-300 shadow-2xl transform scale-110 animate-bounce">
              <h2 className="text-6xl font-bold text-white text-center mb-4 drop-shadow-lg">
                🔔 CAMBIO! 🔔
              </h2>
              <p className="text-2xl text-white text-center font-bold">
                {players.find(p => p.id === room.cambio_caller_id)?.username} called Cambio!
              </p>
              <p className="text-xl text-yellow-100 text-center mt-4">
                Final round - everyone gets one more turn!
              </p>
            </div>
          </div>
        )}

        {/* Power Choice Modal */}
        {showPowerChoice && pendingPower && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-8 border-2 border-yellow-500 max-w-md">
              <h3 className="text-white text-2xl font-bold mb-2 text-center">⚡ Card Power Available!</h3>
              
              {pendingPowerCard && (
                <div className="flex justify-center items-center gap-3 mb-4">
                  <div className="text-4xl font-bold" style={{ color: pendingPowerCard.suit === 'hearts' || pendingPowerCard.suit === 'diamonds' ? 'red' : 'black' }}>
                    {pendingPowerCard.rank}
                    {pendingPowerCard.suit === 'hearts' ? ' ♥' : pendingPowerCard.suit === 'diamonds' ? ' ♦' : pendingPowerCard.suit === 'clubs' ? ' ♣' : ' ♠'}
                  </div>
                </div>
              )}
              
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
                 `${players[room.current_turn]?.username}'s Turn`}
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

            <div className="flex justify-center gap-6 mb-8">
              {players
                .filter(p => p.id !== my_player_id)
                .map(opponent => (
                  <div key={opponent.id}>
                    <OpponentHand 
                      player={opponent}
                      onCardClick={(card, e) => handleOpponentCardClick(opponent, card, e?.shiftKey)}
                      clickable={!!activePower}
                      highlightedCardId={room.highlighted_card_id}
                      recentlyChangedCardId={room.highlighted_card_id}
                    />
                  </div>
                ))}
            </div>

            <div className="flex justify-center gap-8 mb-16">
              <Deck 
                cardCount={room.deck.length}
                onDraw={handleDrawDeck}
                canDraw={!!(isMyTurn && !drawnCard && !activePower && !isFrozen && !selectingCardToGive && !hasDrawn)}
              />
              <DiscardPile 
                cards={room.discard_pile}
                onDraw={() => {}}
                canDraw={false}
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
                onCardClick={(card, e) => handleCardClick(card, my_player_id, e?.shiftKey)}
                highlightedCardId={room.highlighted_card_id}
                recentlyChangedCardId={room.highlighted_card_id}
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

        {/* Chat Component */}
        {isPlaying && myPlayer && (
          <Chat 
            roomId={roomId}
            playerId={my_player_id!}
            playerName={myPlayer.username}
          />
        )}
      </div>
    </div>
  )
}