import { Card, Suit, Rank } from '@/types/card'

export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []
  
  suits.forEach(suit => {
    ranks.forEach((rank) => {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        value: getCardValue(rank),
        power: getCardPower(rank)
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
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 0,
    'JOKER': 0
  }
  return values[rank]
}

const getCardPower = (rank: Rank) => {
  if (rank === '7' || rank === '8') return 'peek_own'
  if (rank === '9' || rank === '10') return 'peek_opponent'
  if (rank === 'J' || rank === 'Q') return 'swap'
  if (rank === 'K') return 'blind_swap'
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