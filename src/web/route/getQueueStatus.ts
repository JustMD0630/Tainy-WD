import util from 'node:util'
import crypto from 'node:crypto'
import { User } from 'discord.js'
import { Manager } from '../../manager.js'
import Fastify from 'fastify'

export async function getQueueStatus(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  client.logger.info(
    'StatusRouterService',
    `${req.method} ${req.routeOptions.url} params=${req.params ? util.inspect(req.params) : '{}'}`
  )
  const guildId = (req.params as Record<string, string>)['guildId']
  const player = client.rainlink.players.get(guildId)
  if (!player) {
    res.code(400)
    res.send({ error: 'Current player not found!' })
    return
  }
  return res.send({
    data: player.queue.map((track: any) => {
      // Inject unique ID for frontend stability
      if (!track._uniqueId) track._uniqueId = crypto.randomUUID()
      
      const requesterQueue = track.requester as User
      return {
        id: track._uniqueId,
        title: track.title,
        uri: track.uri,
        length: track.duration,
        thumbnail: track.artworkUrl,
        author: track.author,
        requester: requesterQueue
          ? {
              id: requesterQueue.id,
              username: requesterQueue.username,
              globalName: requesterQueue.globalName,
              defaultAvatarURL: requesterQueue.defaultAvatarURL ?? null,
            }
          : null,
      }
    }),
  })
}
