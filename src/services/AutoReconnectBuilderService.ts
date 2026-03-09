import { Manager } from '../manager.js'
import { RainlinkPlayer } from 'rainlink'

export class AutoReconnectBuilderService {
  client: Manager
  player?: RainlinkPlayer
  constructor(client: Manager, player?: RainlinkPlayer) {
    this.client = client
    this.player = player
  }

  async execute(guildId: string) {
    const check = await this.client.db.autoreconnect.get(guildId)
    if (check) return check
    if (!this.player) return await this.noPlayerBuild(guildId)
    return await this.playerBuild(guildId)
  }

  async get(guildId: string) {
    const check = await this.client.db.autoreconnect.get(guildId)
    if (check) return check
    else null
  }

  async noPlayerBuild(guildId: string) {
    return await this.client.db.autoreconnect.set(`${guildId}`, {
      guild: guildId,
      text: '',
      voice: '',
      current: '',
      config: {
        loop: 'none',
      },
      queue: [],
      twentyfourseven: false,
    })
  }

  async playerBuild(guildId?: string, two47mode: boolean = false) {
    const id = guildId || this.player?.guildId
    if (!id) return

    return await this.client.db.autoreconnect.set(`${id}`, {
      guild: this.player?.guildId,
      text: this.player?.textId,
      voice: this.player?.voiceId,
      current: this.player?.queue.current ? [this.buildTrackData(this.player.queue.current)] : [],
      config: {
        loop: this.player?.loop,
      },
      queue: this.player?.queue.length !== 0 ? this.queueData() : [],
      previous: this.player?.queue.previous.length !== 0 ? this.previousData() : [],
      twentyfourseven: two47mode,
      position: this.player?.position,
      paused: this.player?.paused
    })
  }

  buildTrackData(track: any) {
      const requester = track.requester
      let requesterId: string | undefined
      let requesterName: string | undefined
      
      if (requester) {
          if (typeof requester === 'string') requesterName = requester
          else if (typeof requester === 'object') {
              requesterId = requester.id
              requesterName = requester.username || requester.tag || requester.globalName
          }
      }

      return {
          uri: track.uri,
          requesterId,
          requesterName
      }
  }

  queueData() {
    return this.player?.queue.map(t => this.buildTrackData(t)) || []
  }

  previousData() {
    return this.player?.queue.previous.map(t => this.buildTrackData(t)) || []
  }

  async build247(guildId: string, mode: boolean = true, voiceId: string = '') {
    return await this.client.db.autoreconnect.set(`${guildId}`, {
      guild: this.player?.guildId,
      text: this.player?.textId,
      voice: voiceId,
      current: '',
      config: {
        loop: 'none',
      },
      queue: [],
      previous: [],
      twentyfourseven: mode,
    })
  }
}
