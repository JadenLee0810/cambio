import { Card, Suit, Rank } from '@/types/card'

export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []
  
  // Standard 52 cards
  suits.forEach(suit => {
    ranks.forEach((rank) => {
      let value = getCardValue(rank)
      
      // Red Kings are -1, Black Kings are 13
      if (rank === 'K') {
        value = (suit === 'hearts' || suit === 'diamonds') ? -1 : 13
      }
      
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        value: value,
        power: getCardPower(rank, suit)
      })
    })
  })
  
  // Add 2 jokers
  deck.push(
    {
      id: 'joker-1',
      suit: 'joker',
      rank: 'JOKER',
      value: 0,
      power: 'wild'
    },
    {
      id: 'joker-2',
      suit: 'joker',
      rank: 'JOKER',
      value: 0,
      power: 'wild'
    }
  )
  
  return deck
}
const getCardValue = (rank: Rank): number => {
  const values: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, // Kings default to 13 (black)
    'JOKER': 0
  }
  return values[rank]
}
const getCardPower = (rank: Rank, suit: Suit) => {
  if (rank === '7' || rank === '8') return 'peek_own'
  if (rank === '9' || rank === '10') return 'peek_opponent'
  if (rank === 'J' || rank === 'Q') return 'swap'
  if (rank === 'K') {
    // Black Kings have special power, Red Kings don't
    return (suit === 'clubs' || suit === 'spades') ? 'black_king' : undefined
  }
  return undefined
}

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}