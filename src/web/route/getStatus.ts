import util from 'node:util'
import { User } from 'discord.js'
import { Manager } from '../../manager.js'
import Fastify from 'fastify'

export async function getStatus(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  if (client.config.utilities.WEB_SERVER.httpreq) {
    client.logger.info(
      'StatusRouterService',
      `${req.method} ${req.routeOptions.url} params=${req.params ? util.inspect(req.params) : '{}'}`
    )
  }
  let isMemeberInVoice = 'notGiven'
  const guildId = (req.params as Record<string, string>)['guildId']
  const player = client.rainlink.players.get(guildId)

  // FIX: Return 200 OK with null if player doesn't exist to avoid 404 console errors
  if (!player) {
    res.send(null)
    return
  }
  if (req.headers['user-id']) {
    const userId = req.headers['user-id'] as string
    const Guild = await client.guilds.fetch(guildId)
    const Member = await Guild.members.fetch(userId).catch(() => undefined)
    if (!Member || !Member.voice.channel || !Member.voice) isMemeberInVoice = 'false'
    else isMemeberInVoice = 'true'
  }

  const song = player.queue.current
  const requester = song ? (song.requester as User) : null

  let voiceChannelName = null
  if (player.voiceId) {
      try {
          const channel = await client.channels.fetch(player.voiceId)
          if (channel && 'name' in channel) {
              voiceChannelName = channel.name
          }
      } catch (e) {
          // Ignore error if channel not found
      }
  }

  res.send({
    guildId: player.guildId,
    loop: player.loop,
    paused: player.paused,
    volume: player.volume, // Send volume
    member: isMemeberInVoice,
    position: player.position,
    voiceChannel: player.voiceId, // Send voice channel ID
    voiceChannelName: voiceChannelName, // Send voice channel Name
    current: song
      ? {
          title: song.title,
          uri: song.uri,
          length: song.duration,
          thumbnail: song.artworkUrl,
          author: song.author,
          requester: requester
            ? {
                id: requester.id,
                username: requester.username,
                globalName: requester.globalName,
                defaultAvatarURL: requester.defaultAvatarURL ?? null,
              }
            : null,
        }
      : null,
    queue: player.queue.map((track) => {
      const requesterQueue = track.requester as User
      return {
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
