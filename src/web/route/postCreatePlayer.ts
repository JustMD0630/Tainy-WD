import util from 'node:util'
import { Guild, GuildMember, ChannelType } from 'discord.js'
import { Manager } from '../../manager.js'
import Fastify from 'fastify'

export class PostCreatePlayer {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    this.client.logger.info(
      PostCreatePlayer.name,
      `${req.method} ${req.routeOptions.url} payload=${req.body ? util.inspect(req.body) : '{}'}`
    )

    const data = req.body as Record<string, string>

    // 1. Validation (Logic from Version anterior, but stateless)
    if (!data) return this.errorRes(req, res, 'Missing body')
    if (!data['guildId']) return this.errorRes(req, res, 'Missing guildId key')
    if (!data['userId']) return this.errorRes(req, res, 'Missing userId key')

    const guild = await this.client.guilds.fetch(data['guildId']).catch(() => undefined)
    if (!guild) return this.errorRes(req, res, 'Guild not found')

    const isPlayerExist = this.client.rainlink.players.get(guild.id)
    if (isPlayerExist) {
        // C) Do not kill restored session
        this.client.logger.info(PostCreatePlayer.name, `Player already exists for guild ${guild.id}, returning existing session.`)
        res.send({
            guildId: isPlayerExist.guildId,
            voiceId: isPlayerExist.voiceId,
            textId: isPlayerExist.textId,
            volume: isPlayerExist.volume
        })
        return
    }

    const member = await guild.members.fetch(data['userId']).catch(() => undefined)
    if (!member) return this.errorRes(req, res, 'User not found')

    // Simple voice check from Version anterior
    if (!member.voice.channel) {
      return this.errorRes(req, res, 'User is not in voice')
    }

    // 2. Logic
    const textChannel = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.viewable
    )
    const textId = textChannel ? textChannel.id : ''

    const playerData = {
      guildId: guild.id,
      voiceId: member.voice.channel.id,
      textId: textId,
      shardId: guild.shardId ?? 0,
      deaf: true,
      volume: this.client.config.player.DEFAULT_VOLUME,
    }

    try {
      await this.client.rainlink.create(playerData)
      this.client.logger.info(
        PostCreatePlayer.name,
        `Player created successfully for guild ${guild.id}`
      )
      res.send(playerData)
    } catch (err) {
      this.client.logger.error(PostCreatePlayer.name, `Failed to create player: ${err}`)
      res.code(500).send({ error: 'Failed to create player', details: String(err) })
    }
  }

  async errorRes(req: Fastify.FastifyRequest, res: Fastify.FastifyReply, message: string) {
    res.code(400)
    res.send({ error: message })
  }
}
