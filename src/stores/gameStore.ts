import { create } from 'zustand'
import { GameState } from '@/types/game'
import { Player } from '@/types/player'
import { subscribeToGameRoom } from '@/lib/supabase/realtime'

interface GameStore extends GameState {
  isConnected: boolean
  error: string | null
  
  setGameState: (state: Partial<GameState>) => void
  updateRoom: (room: GameState['room']) => void
  updatePlayer: (player: Player) => void
  setError: (error: string | null) => void
  
  // Real-time methods
  subscribeToRoom: (roomId: string) => void
  unsubscribe: () => void
}

let unsubscribeFn: (() => void) | null = null

export const useGameStore = create<GameStore>((set, get) => ({
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
  
  subscribeToRoom: (roomId) => {
    // Unsubscribe from previous room
    if (unsubscribeFn) {
      unsubscribeFn()
    }
    
    unsubscribeFn = subscribeToGameRoom(roomId, {
      onRoomUpdate: (room) => {
        get().updateRoom(room)
        set({ isConnected: true, error: null })
      },
      onPlayerUpdate: (player) => {
        get().updatePlayer(player)
      },
      onAction: (action) => {
        set({ last_action: action })
      }
    })
  },
  
  unsubscribe: () => {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }
    set({ isConnected: false })
  }
}))