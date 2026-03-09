export interface AutoReconnect {
  guild: string
  text: string
  voice: string
  config: {
    loop: string
    volume: number
  }
  queue: { uri: string; requesterId?: string; requesterName?: string }[]
  previous: { uri: string; requesterId?: string; requesterName?: string }[]
  twentyfourseven: boolean
  position?: number
  paused?: boolean
  current?: { uri: string; requesterId?: string; requesterName?: string }[]
}
