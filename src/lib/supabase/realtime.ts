import { createClient } from './client'
import { GameRoom } from '@/types/game'
import { Player } from '@/types/player'

export const subscribeToGameRoom = (
  roomId: string,
  callbacks: {
    onRoomUpdate: (room: GameRoom) => void
    onPlayerUpdate: (player: Player) => void
    onAction: (action: any) => void
  }
) => {
  const supabase = createClient()
  
  const roomChannel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`
      },
      (payload) => {
        if (payload.new) {
          callbacks.onRoomUpdate(payload.new as GameRoom)
        }
      }
    )
    .subscribe()
  
  const playersChannel = supabase
    .channel(`players:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        if (payload.new) {
          callbacks.onPlayerUpdate(payload.new as Player)
        }
      }
    )
    .subscribe()
  
  const actionsChannel = supabase
    .channel(`actions:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_actions',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        if (payload.new) {
          callbacks.onAction(payload.new)
        }
      }
    )
    .subscribe()
  
  return () => {
    roomChannel.unsubscribe()
    playersChannel.unsubscribe()
    actionsChannel.unsubscribe()
  }
}