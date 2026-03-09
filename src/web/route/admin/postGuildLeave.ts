import { Manager } from '../../../manager.js'
import Fastify from 'fastify'

export class PostGuildLeave {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    // Auth Check
    const { userId, reason } = req.body as { userId?: string, reason?: string }
    const { guildId } = req.params as { guildId: string }

    if (!userId) return res.code(401).send({ error: 'Unauthorized' })

    const isAdmin = this.client.owner === userId || (this.client.config.bot.ADMIN || []).includes(userId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })

    try {
        const guild = this.client.guilds.cache.get(guildId)
        if (!guild) return res.code(404).send({ error: 'Guild not found' })

        if (reason) {
            try {
                const owner = await guild.fetchOwner()
                await owner.send(`I have left **${guild.name}** because: ${reason}`)
            } catch (e) {
                this.client.logger.warn('PostGuildLeave', `Could not DM owner of ${guild.name}`)
            }
        }

        await guild.leave()
        this.client.logger.info('PostGuildLeave', `Left guild ${guild.name} (${guild.id}) requested by admin ${userId}. Reason: ${reason || 'None'}`)

        res.send({ success: true, message: `Left guild ${guild.name}` })
    } catch (err) {
        this.client.logger.error('PostGuildLeave', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}