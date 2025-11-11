export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  value: number
  power?: CardPower
}

export type CardPower = 
  | 'peek_own'
  | 'peek_opponent'
  | 'swap'
  | 'blind_swap'
  | 'wild'

export interface CardInHand extends Card {
  isFaceUp: boolean
  position: number
}