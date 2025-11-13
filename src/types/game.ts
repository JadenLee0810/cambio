import { Card, CardInHand } from './card'
import { Player } from './player'

export type GamePhase = 'setup' | 'playing' | 'showdown' | 'ended'
export type GameStatus = 'waiting' | 'playing' | 'finished'

export interface GameRoom {
  id: string
  room_code: string
  status: GameStatus
  game_phase: GamePhase
  current_turn: number
  max_players: number
  deck: Card[]
  discard_pile: Card[]
  created_at: string
  started_at?: string
  finished_at?: string
  settings: GameSettings
  creator_id?: string
  cambio_caller_id?: string
}

export interface GameSettings {
    cards_per_player: number
    allow_card_powers: boolean
    reaction_window_ms: number
    cambio_penalty: number
}

export interface GameState {
    room: GameRoom | null
    players: Player[]
    my_player_id?: string
    last_action?: any
}

export type ActionType =
    | 'draw_from_deck'
    | 'draw_from_discard'
    | 'discard'
    | 'swap_cards'
    | 'peek_card'
    | 'call_cambio'
    | 'race_discard'