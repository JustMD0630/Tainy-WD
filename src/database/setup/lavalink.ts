import { Manager } from '../../manager.js'
import { AutoReconnect } from '../schema/AutoReconnect.js'
import { VoiceChannel } from 'discord.js'
import { RainlinkLoopMode, RainlinkPlayer } from 'rainlink'

export class AutoReconnectLavalinkService {
  client: Manager
  constructor(client: Manager) {
    this.client = client
    this.execute()
  }

  async execute() {
    this.client.logger.info(AutoReconnectLavalinkService.name, `Setting up data for lavalink...`)
    this.client.logger.info(
      AutoReconnectLavalinkService.name,
      `Auto ReConnect Collecting player 24/7 data`
    )
    const maindata = await this.client.db.autoreconnect.all()

    if (!maindata || maindata.length == 0) {
      this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `Auto ReConnect found in 0 servers!`
      )
      this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `Setting up data for lavalink complete!`
      )
      return
    }

    this.client.logger.info(
      AutoReconnectLavalinkService.name,
      `Auto ReConnect found in ${Object.keys(maindata).length} servers!`
    )
    if (Object.keys(maindata).length === 0) return

    let retry_interval = setInterval(async () => {
      if (this.client.lavalinkUsing.length == 0 || this.client.rainlink.nodes.size == 0)
        return this.client.logger.info(
          AutoReconnectLavalinkService.name,
          `No lavalink avalible, try again after 3 seconds!`
        )

      clearInterval(retry_interval)

      this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `Lavalink avalible, remove interval and continue setup!`
      )

      for await (const data of maindata) {
        setTimeout(async () => this.connectChannel(data))
      }

      this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `Reconnected to all ${Object.keys(maindata).length} servers!`
      )

      this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `Setting up data for lavalink complete!`
      )
    }, 3000)
  }

  async connectChannel(data: { id: string; value: AutoReconnect }) {
    const channel = await this.client.channels.fetch(data.value.text).catch(() => undefined)
    const guild = await this.client.guilds.fetch(data.value.guild).catch(() => undefined)
    const voice = (await this.client.channels
      .fetch(data.value.voice)
      .catch(() => undefined)) as VoiceChannel
    if (!channel || !voice) {
      this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `The last voice/text channel that bot joined in guild [${data.value.guild}] is not found, skipping...`
      )
      if (data.value.guild) {
          return this.client.db.autoreconnect.delete(data.value.guild)
      }
      return
    }

    if (!data.value.twentyfourseven && voice.members.filter((m) => !m.user.bot).size == 0) {
      this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `Guild [${data.value.guild}] have 0 members in last voice that bot joined, skipping...`
      )
      if (data.value.guild) {
          return this.client.db.autoreconnect.delete(data.value.guild)
      }
      return
    }

    const player = await this.client.rainlink.create({
      guildId: data.value.guild,
      voiceId: data.value.voice,
      textId: data.value.text,
      shardId: guild ? guild.shardId : 0,
      deaf: true,
      volume: this.client.config.player.DEFAULT_VOLUME,
    })

    if (!this.client.config.utilities.AUTO_RESUME)
      return this.client.logger.info(
        AutoReconnectLavalinkService.name,
        `Auto resume disabled, now skipping all.`
      )

    if (data.value.current && data.value.current.length !== 0) {
      // B) Restore: AutoReconnectLavalinkService must use URIs
      const currentData = data.value.current[0] as any
      const currentUri = currentData.uri || currentData // Support both new object and old string format
      
      // Resolve requester
      let requester: any = this.client.user
      if (typeof currentData === 'object' && currentData.requesterId) {
          try {
              requester = await this.client.users.fetch(currentData.requesterId)
          } catch {
              requester = currentData.requesterName || `<@${currentData.requesterId}>`
          }
      } else if (typeof currentData === 'object' && currentData.requesterName) {
          requester = currentData.requesterName
      }

      const search = await player.search(currentUri, {
        requester: requester,
      })
      if (!search.tracks.length) {
          this.client.logger.info(AutoReconnectLavalinkService.name, `Failed to restore current track: ${currentUri}`)
          return
      }

      if (data.value.queue.length !== 0) {
          // Restore queue using URIs
          const queueData = data.value.queue
          for (const item of queueData) {
              const uri = (item as any).uri || item
              if (!uri || typeof uri !== 'string') continue

              let req: any = this.client.user
              if (typeof item === 'object' && (item as any).requesterId) {
                  try {
                      req = await this.client.users.fetch((item as any).requesterId)
                  } catch {
                      req = (item as any).requesterName || `<@${(item as any).requesterId}>`
                  }
              }

              const s = await player.search(uri, { requester: req })
              if (s.tracks.length > 0) {
                  player.queue.add(s.tracks[0])
              }
          }
      }

      if (data.value.previous.length !== 0) {
         // Restore previous queue using URIs
         const prevData = data.value.previous
         for (const item of prevData) {
             const uri = (item as any).uri || item
             if (!uri || typeof uri !== 'string') continue
             
             let req: any = this.client.user
             if (typeof item === 'object' && (item as any).requesterId) {
                 try {
                     req = await this.client.users.fetch((item as any).requesterId)
                 } catch {
                     req = (item as any).requesterName || `<@${(item as any).requesterId}>`
                 }
             }

             const s = await player.search(uri, { requester: req })
             if (s.tracks.length > 0) {
                 player.queue.previous.push(s.tracks[0])
             }
         }
      }

      if (data.value.config.loop !== 'none')
        player.setLoop(data.value.config.loop as RainlinkLoopMode)
      
      // 1) Reanudar en la misma posición (seek) al restaurar
      const savedPosition = data.value.position
      const savedPaused = data.value.paused

      // One-time listener for trackStart to apply seek/pause
      if (savedPosition > 0 || savedPaused) {
          const onStart = (p: RainlinkPlayer) => {
              if (p.guildId !== player.guildId) return
              
              try {
                  if (savedPosition > 0) p.seek(savedPosition)
                  if (savedPaused) p.setPause(true)
                  this.client.logger.info(AutoReconnectLavalinkService.name, `Restored state: pos=${savedPosition}ms, paused=${savedPaused}`)
              } catch (err) {
                  this.client.logger.warn(AutoReconnectLavalinkService.name, `Failed to seek/pause on restore: ${err}`)
              }
              // Remove listener
              // @ts-ignore - Rainlink typings might be missing strict event types here
              this.client.rainlink.off('trackStart', onStart)
          }
          
          // @ts-ignore - Rainlink typings
          this.client.rainlink.on('trackStart', onStart)
      }

      await player.play(search.tracks[0])
    }
  }

  async queueDataPush(query: string[], player: RainlinkPlayer) {
    const SongAdd = []
    let SongLoad = 0

    for (const data of query) {
      const res = await player.search(data, {
        requester: this.client.user,
      })
      if (res.type == 'TRACK') {
        SongAdd.push(res.tracks[0])
        SongLoad++
      } else if (res.type == 'PLAYLIST') {
        for (let t = 0; t < res.tracks.length; t++) {
          SongAdd.push(res.tracks[t])
          SongLoad++
        }
      } else if (res.type == 'SEARCH') {
        SongAdd.push(res.tracks[0])
        SongLoad++
      }
      if (SongLoad == query.length) {
        player.queue.add(SongAdd)
      }
    }
  }

  async previousDataPush(query: string[], player: RainlinkPlayer) {
    const SongAdd = []
    let SongLoad = 0

    for (const data of query) {
      const res = await player.search(data, {
        requester: this.client.user,
      })
      if (res.type == 'TRACK') {
        SongAdd.push(res.tracks[0])
        SongLoad++
      } else if (res.type == 'PLAYLIST') {
        for (let t = 0; t < res.tracks.length; t++) {
          SongAdd.push(res.tracks[t])
          SongLoad++
        }
      } else if (res.type == 'SEARCH') {
        SongAdd.push(res.tracks[0])
        SongLoad++
      }
      if (SongLoad == query.length) {
        player.queue.previous.push(...SongAdd)
      }
    }
  }
}
