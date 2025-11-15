import { CardInHand } from './card'

export interface Player {
  id: string
  room_id: string
  username: string
  player_index: number
  hand: any[]
  score: number
  has_peeked: boolean
  is_ready?: boolean  // ADD THIS LINE
  created_at?: string
}