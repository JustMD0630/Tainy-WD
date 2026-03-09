import { Manager } from '../../../manager.js'
import Fastify from 'fastify'

export class DeleteNotification {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    const { userId } = req.query as { userId: string }
    const { id } = req.params as { id: string }

    if (!userId) return res.code(401).send({ error: 'Unauthorized' })

    try {
        const notification = await this.client.db.notification.get(id)
        if (!notification) {
            return res.code(404).send({ error: 'Not Found' })
        }

        if (notification.userId !== userId) {
            return res.code(403).send({ error: 'Forbidden' })
        }

        await this.client.db.notification.delete(id)
        res.send({ success: true })
    } catch (err) {
        this.client.logger.error('DeleteNotification', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
