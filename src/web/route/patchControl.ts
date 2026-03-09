import util from 'node:util'
import { Manager } from '../../manager.js'
import Fastify from 'fastify'
import { RainlinkLoopMode, RainlinkPlayer, RainlinkTrack } from 'rainlink'

export type TrackRes = {
  title: string
  uri: string
  length: number
  thumbnail: string
  author: string
  requester: any
}

export class PatchControl {
  constructor(protected client: Manager) {}

  private getQueueSize(player: RainlinkPlayer): number {
    const q: any = player.queue as any
    if (typeof q?.size === 'number') return q.size
    if (Array.isArray(q)) return q.length
    if (typeof q?.length === 'number') return q.length
    return 0
  }

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    this.client.logger.info(
      PatchControl.name,
      `${req.method} ${req.routeOptions.url} payload=${req.body ? util.inspect(req.body) : '{}'}`
    )

    const isValid = await this.checker(req, res)
    if (!isValid) return

    const guildId = (req.params as Record<string, string>)['guildId']
    const player = this.client.rainlink.players.get(guildId) as RainlinkPlayer
    const jsonBody = req.body as Record<string, unknown>
    const currentKeys = Object.keys(jsonBody)

    // Local state for this request (Stateless class)
    let skiped = false
    let isPrevious = false
    let addedTrack: TrackRes[] = []
    
    // Extract requester if present (Improvement)
    const requesterId = jsonBody['requester'] as string | undefined
    let requesterUser = this.client.user
    if (requesterId) {
        try {
            const u = await this.client.users.fetch(requesterId)
            if (u) requesterUser = u as any
        } catch (e) {}
    }

    for (const key of currentKeys) {
      if (key === 'requester') continue

      if (key === 'add') {
          const result = await this.add(res, player, jsonBody[key] as string[] | { encoded: string }, requesterUser)
          if (!result) return // Error response sent in add
          addedTrack = result
      } else if (key === 'skipMode') {
          const result = await this.skipMode(res, player, jsonBody[key] as string)
          if (!result) return
          if (jsonBody[key] === 'skip') skiped = true
          if (jsonBody[key] === 'previous') isPrevious = true
      } else if (key === 'move') {
          const result = await this.move(res, player, jsonBody[key] as { from: number, to: number })
          if (!result) return
      } else if (key === 'remove') {
          const result = await this.remove(res, player, jsonBody[key] as number)
          if (!result) return
      } else {
          // Other methods: loop, position, volume, pause
          const result = await (this as any)[key](res, player, jsonBody[key])
          if (!result) return
      }
    }

    res.send({
      loop: jsonBody.loop,
      skiped: skiped,
      previous: isPrevious,
      position: jsonBody.position,
      volume: jsonBody.volume,
      added: addedTrack,
    })
  }

  async loop(res: Fastify.FastifyReply, player: RainlinkPlayer, mode: string) {
    if (!mode || !['song', 'queue', 'none'].includes(mode)) {
      res.code(400)
      res.send({ error: `Invalid loop mode, '${mode}' mode does not exist!` })
      return false
    }
    player.setLoop(mode as RainlinkLoopMode)
    return true
  }

  async skipMode(res: Fastify.FastifyReply, player: RainlinkPlayer, mode: string) {
    if (!mode || !['previous', 'skip'].includes(mode)) {
      res.code(400)
      res.send({ error: `Invalid loop mode, '${mode}' mode does not exist!` })
      return false
    }

    const queueSize = this.getQueueSize(player)
    const hasCurrent = Boolean((player.queue as any).current)

    if (queueSize === 0 && !hasCurrent) return true

    if (mode === 'skip') {
      await player.skip()
      return true
    }

    await player.previous()
    return true
  }

  async position(res: Fastify.FastifyReply, player: RainlinkPlayer, pos: string) {
    if (isNaN(Number(pos))) {
      res.code(400)
      res.send({ error: `Position must be a number!` })
      return false
    }
    await player.seek(Number(pos))
    return true
  }

  async volume(res: Fastify.FastifyReply, player: RainlinkPlayer, vol: string) {
    if (!vol) return true
    if (isNaN(Number(vol))) {
      res.code(400)
      res.send({ error: `Volume must be a number!` })
      return false
    }
    await player.setVolume(Number(vol))
    return true
  }

  async pause(res: Fastify.FastifyReply, player: RainlinkPlayer, pause: boolean) {
    if (typeof pause !== 'boolean') {
      res.code(400)
      res.send({ error: `pause property must be a boolean!` })
      return false
    }
    await player.setPause(pause)
    return true
  }

  async shuffle(res: Fastify.FastifyReply, player: RainlinkPlayer, shuffle: boolean) {
    if (typeof shuffle !== 'boolean') {
      res.code(400)
      res.send({ error: `shuffle property must be a boolean!` })
      return false
    }
    player.queue.shuffle()
    return true
  }

  async move(res: Fastify.FastifyReply, player: RainlinkPlayer, move: { from: number, to: number }) {
    if (typeof move.from !== 'number' || typeof move.to !== 'number') {
      res.code(400)
      res.send({ error: `move property must have 'from' and 'to' indices!` })
      return false
    }

    const queue = player.queue as any
    if (!queue || queue.length === 0) return true

    // Requisito: Índices 0 se refieren a 'current track'.
    // No soportamos mover la canción actual.
    if (move.from === 0 || move.to === 0) {
        // En lugar de error, ignorar silently para no romper UI si el usuario intenta mover el 0
        // res.code(400)
        // res.send({ error: "Moving current track is not supported" })
        return true 
    }

    // Traducir índices visuales (1..N) a índices de upcoming (0..N-1)
    const fromIdx = move.from - 1
    const toIdx = move.to - 1

    // Validar rangos en upcoming
    if (fromIdx < 0 || fromIdx >= queue.length) {
       // Index out of bounds
       return true
    }

    // Snapshot de upcoming tracks para movimiento determinista
    const arr: any[] = []
    for (let i = 0; i < queue.length; i++) {
        arr.push(queue[i])
    }

    // Validar item existente
    if (!arr[fromIdx]) return true

    // Extraer item
    const [item] = arr.splice(fromIdx, 1)

    // Clamp toIdx
    let targetIdx = toIdx
    if (targetIdx < 0) targetIdx = 0
    if (targetIdx > arr.length) targetIdx = arr.length
    
    arr.splice(targetIdx, 0, item)

    // Reconstruir queue (upcoming)
    if (typeof queue.clear === 'function') {
        queue.clear()
    } else {
        while (queue.length > 0) {
            queue.remove(0)
        }
    }
    
    for (const t of arr) {
        queue.add(t)
    }
    
    return true
  }

  async remove(res: Fastify.FastifyReply, player: RainlinkPlayer, index: number) {
    if (typeof index !== 'number') {
      res.code(400)
      res.send({ error: `remove property must be a number!` })
      return false
    }

    const queue = player.queue as any
    if (!queue || queue.length === 0) return true

    // El índice 0 representa la canción actual, no se elimina desde la cola (se usa skip)
    if (index === 0) return true

    // Traducir índice visual (1..N) a índice de cola (0..N-1)
    const actualIndex = index - 1

    if (actualIndex < 0 || actualIndex >= queue.length) return true

    // Guardar referencia para el evento
    const song = queue[actualIndex];

    // Eliminar usando método oficial para eventos internos
    if (typeof player.queue.remove === 'function') {
        player.queue.remove(actualIndex)
    } else {
        // Fallback si no existe remove (raro en Rainlink)
        queue.splice(actualIndex, 1)
    }

    // Notificar a clientes WebSocket para actualización en tiempo real
    const wsClient = this.client.wsl.get(player.guildId)
    if (wsClient) {
        wsClient.send({
            op: 'playerQueueRemove',
            guild: player.guildId,
            track: {
                title: song.title,
                uri: song.uri,
                length: song.duration,
                thumbnail: song.artworkUrl,
                author: song.author,
                requester: song.requester
            },
            index: actualIndex
        })
    }
    
    return true
  }

  async add(res: Fastify.FastifyReply, player: RainlinkPlayer, data: string[] | { encoded: string }, requester: any): Promise<TrackRes[] | false> {
    if (!data) return []
    
    // Normalize input to array of strings or handle object
    let itemsToProcess: string[] = []
    
    if (Array.isArray(data)) {
        itemsToProcess = data
    } else if (typeof data === 'object' && data.encoded) {
        // Direct encoded object handling
        // We will push a special marker or just handle it directly here to avoid array logic confusion?
        // Let's reuse the loop by pushing "encoded:<base64>" since we already support it
        // OR we can handle it separately.
        // User asked to support { encoded: "..." } AND legacy string.
        // Let's convert object to the legacy string format for internal processing consistency
        itemsToProcess = [`encoded:${data.encoded}`]
    } else {
      res.code(400)
      res.send({ error: `add property must be an array of queries or an object with encoded property!` })
      return false
    }

    let lastAdded: any = null
    const addedTracks: TrackRes[] = []

    for (const uri of itemsToProcess) {
      if (typeof uri !== 'string' || uri.trim().length === 0) {
        res.code(400)
        res.send({ error: `add property has an invalid item` })
        return false
      }

      // Check for encoded track
      if (uri.startsWith('encoded:')) {
          const encodedTrack = uri.substring(8);
          this.client.logger.info('PatchControl', `Processing encoded track: ${encodedTrack.substring(0, 12)}...`)
          
          try {
             // Decode directly using node REST
             // This ensures we get the EXACT track as it was on the client
             const decoded = await player.node.rest.decodeTrack(encodedTrack)
             
             if (decoded) {
                  this.client.logger.info('PatchControl', `Decoded track: ${decoded.info.uri} (${decoded.info.sourceName})`)
                  // Pass sourceName as driverName to ensure correct driver handling
                  const track = new RainlinkTrack(decoded, requester, decoded.info.sourceName)
                  player.queue.add(track)
                  
                  // Add to result
                 addedTracks.push({
                    title: track.title,
                    uri: track.uri || '',
                    length: track.duration,
                    thumbnail: track.artworkUrl || '',
                    author: track.author,
                    requester: track.requester,
                 })
                 
                 if (!lastAdded) lastAdded = track
                 continue // Skip search logic
             } else {
                 this.client.logger.warn('PatchControl', `Failed to decode track: ${encodedTrack.substring(0, 12)}...`)
             }
          } catch (e) {
              this.client.logger.error('DashboardAddEncoded', e)
          }
          // If decode failed, should we fallback to search? User says "NO usar search como fallback para encoded"
          // So we continue to next item or return error?
          // Let's continue but warn.
          continue
      } 
      
      // Normal search logic for non-encoded items
      // Ensure we use the exact URI if it's a link (http/https) to avoid search engines resolving to different tracks
      let searchUri = uri
      if (uri.startsWith('http')) {
          this.client.logger.info('PatchControl', `Adding track via direct URI: ${uri}`)
          // Direct URL should not have prefixes
      } else {
          // If it's not a URL, it might be a search query, but we want to avoid re-searching if possible.
          // However, if the frontend sends a query, we have to search.
      }

      const result = await player.search(searchUri, { requester: requester }).catch((e) => {
        this.client.logger.error('DashboardAdd', e)
        return undefined
      })

      if (result) {
         if (result.type === 'TRACK' || result.type === 'SEARCH') {
             const track = result.tracks[0]
             if (track) {
                 this.client.logger.info('PatchControl', `Lavalink source: ${track.source}`)
                 this.client.logger.info('PatchControl', `Track loaded: ${track.title}`)
             }
         }
      }

      if (!result || result.tracks.length === 0) {
        // If searching a track failed, try next one? Or fail all?
        // Let's warn and continue to next track so one bad link doesn't stop the whole playlist
        this.client.logger.warn('DashboardAdd', `Track not found: ${uri}`)
        continue
      }

      // Handle Playlist result from Lavalink search
      if (result.type === 'PLAYLIST') {
          for (const track of result.tracks) {
              player.queue.add(track)
              addedTracks.push({
                title: track.title,
                uri: track.uri || '',
                length: track.duration,
                thumbnail: track.artworkUrl || '',
                author: track.author,
                requester: track.requester,
              })
          }
          // Set lastAdded to first track of playlist to start playing immediately?
          // Or we let the queue logic handle it.
          // Usually we want to play the first track of the playlist if nothing is playing.
          if (!lastAdded) lastAdded = result.tracks[0]
      } else {
          // Single Track
          const song = result.tracks[0]
          // Only update lastAdded if it's the first successful track we found (to play it)
          if (!lastAdded) lastAdded = song

          player.queue.add(song)
          addedTracks.push({
            title: song.title,
            uri: song.uri || '',
            length: song.duration,
            thumbnail: song.artworkUrl || '',
            author: song.author,
            requester: song.requester,
          })
      }
    }

    const queueSize = this.getQueueSize(player)
    const hasCurrent = Boolean((player.queue as any).current)

    // Logic from Version anterior for auto-play
    // "The Fix: ignore player.paused check, just check if we need to play"
    if (!player.playing && (queueSize > 0 || hasCurrent)) {
      try {
        // Force unpause logic from Version anterior
        // if (player.paused) ... (player as any).setPause...
        // But let's use the safer one from before that worked?
        // User said "copias el codigo completo ... de la version anterior".
        // Version anterior code:
        /*
        if (player.paused) {
            await (player as any).setPause?.(false).catch(() => {})
        }
        if (lastAdded) {
            await player.play(lastAdded)
        } else {
            await player.play()
        }
        */
        
        if (player.paused) {
             // Try to force unpause if supported
             await player.setPause(false).catch(() => {})
        }

        if (lastAdded) {
            await player.play(lastAdded)
        } else {
            await player.play()
        }
      } catch (err) {
        this.client.logger.error('DashboardAdd', err)
        res.code(503)
        res.send({ error: 'Failed to start playback from dashboard', details: String(err) })
        return false
      }
    }

    return addedTracks
  }

  async checker(req: Fastify.FastifyRequest, res: Fastify.FastifyReply): Promise<boolean> {
    // Added 'requester' to accepted keys as improvement
    const accpetKey: string[] = ['loop', 'skipMode', 'position', 'volume', 'add', 'requester', 'pause', 'shuffle', 'move', 'remove']
    const guildId = (req.params as Record<string, string>)['guildId']
    const player = this.client.rainlink.players.get(guildId)
    
    if (!player) {
      res.code(404)
      res.send({ error: 'Current player not found!' })
      return false
    }
    if (req.headers['content-type'] !== 'application/json') {
      res.code(400)
      res.send({ error: 'content-type must be application/json!' })
      return false
    }
    if (!req.body) {
      res.code(400)
      res.send({ error: 'Missing body' })
      return false
    }
    const jsonBody = req.body as Record<string, unknown>
    for (const key of Object.keys(jsonBody)) {
      if (!accpetKey.includes(key)) {
        res.code(400)
        res.send({ error: `Invalid body, key '${key}' does not exist!` })
        return false
      }
    }
    return true
  }
}
