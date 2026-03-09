import { Manager } from '../../../manager.js'
import Fastify from 'fastify'

export class GetAdminGuilds {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    // Auth Check
    const { userId } = req.query as { userId?: string }
    if (!userId) return res.code(401).send({ error: 'Unauthorized' })

    const isAdmin = this.client.owner === userId || (this.client.config.bot.ADMIN || []).includes(userId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })

    try {
        const guilds = await Promise.all(this.client.guilds.cache.map(async guild => {
            const player = this.client.rainlink.players.get(guild.id)
            let ownerName = 'Unknown'
            try {
                const owner = await guild.fetchOwner()
                ownerName = owner.user.username
            } catch {
                ownerName = 'Unknown'
            }

            return {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ size: 64 }) || null,
                memberCount: guild.memberCount,
                ownerId: guild.ownerId,
                ownerName: ownerName,
                joinedAt: guild.joinedTimestamp,
                createdAt: guild.createdTimestamp,
                isPlaying: !!player && player.playing
            }
        }))

        // Sort by member count descending
        guilds.sort((a, b) => b.memberCount - a.memberCount)

        res.send({ success: true, guilds })
    } catch (err) {
        this.client.logger.error('GetAdminGuilds', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}