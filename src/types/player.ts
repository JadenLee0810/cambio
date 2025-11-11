import { CardInHand } from './card'

export interface Player {
  id: string
  room_id: string
  username: string
  player_index: number
  hand: CardInHand[]
  score: number
  is_ready: boolean
  is_connected: boolean
  last_action_at: string
}