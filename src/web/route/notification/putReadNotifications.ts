
import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export const putReadNotifications = async (
  client: Manager,
  req: FastifyRequest,
  res: FastifyReply
) => {
  const { userId } = req.body as { userId: string }

  if (!userId) {
    return res.code(400).send({ error: 'User ID is required' })
  }

  const allNotifications = await client.db.notification.all()

  for (const entry of allNotifications) {
    const notification = entry.value
    if (notification.userId === userId && !notification.read) {
      notification.read = true
      await client.db.notification.set(notification.id, notification)
    }
  }

  return res.send({ success: true })
}
