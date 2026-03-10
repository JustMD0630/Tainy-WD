import { Manager } from '../../../manager.js'
import Fastify from 'fastify'

import { getAuthedUserId } from '../../util/auth.js'

export class GetAdminNotifications {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    const authedUserId = await getAuthedUserId(req)
    if (!authedUserId) return res.code(401).send({ error: 'Unauthorized' })

    const isAdmin = this.client.owner === authedUserId || (this.client.config.bot.ADMIN || []).includes(authedUserId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })

    try {
        const notifications = await this.client.db.notification.all()
        const parsed = []
        
        for (const n of notifications) {
            const note = n.value
            const user = await this.client.users.fetch(note.userId).catch(() => null)
            parsed.push({
                ...note,
                userName: user?.username || 'Desconocido',
                userAvatar: user?.displayAvatarURL({ size: 64 })
            })
        }

        // Sort by newest
        parsed.sort((a, b) => b.created - a.created)

        res.send({ success: true, notifications: parsed })
    } catch (err) {
        this.client.logger.error('GetAdminNotifications', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
