import { create } from 'zustand'
import { GameState } from '@/types/game'
import { Player } from '@/types/player'

interface GameStore extends GameState {
  isConnected: boolean
  error: string | null
  
  setGameState: (state: Partial<GameState>) => void
  updateRoom: (room: GameState['room']) => void
  updatePlayer: (player: Player) => void
  setError: (error: string | null) => void
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  players: [],
  my_player_id: undefined,
  last_action: undefined,
  isConnected: false,
  error: null,
  
  setGameState: (state) => set(state),
  
  updateRoom: (room) => set({ room }),
  
  updatePlayer: (updatedPlayer) => set((state) => {
    const playerIndex = state.players.findIndex(p => p.id === updatedPlayer.id)
    if (playerIndex >= 0) {
      const newPlayers = [...state.players]
      newPlayers[playerIndex] = updatedPlayer
      return { players: newPlayers }
    } else {
      return { players: [...state.players, updatedPlayer] }
    }
  }),
  
  setError: (error) => set({ error }),
}))