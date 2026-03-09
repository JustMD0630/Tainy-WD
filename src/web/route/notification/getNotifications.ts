
import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { Notification } from '../../../database/schema/Notification.js'

export const getNotifications = async (
  client: Manager,
  req: FastifyRequest,
  res: FastifyReply
) => {
  const { userId } = req.query as { userId: string }

  if (!userId) {
    return res.code(400).send({ error: 'User ID is required' })
  }

  const allNotifications = await client.db.notification.all()
  const userNotifications: Notification[] = []

  for (const entry of allNotifications) {
    const notification = entry.value as Notification
    if (notification.userId === userId) {
      userNotifications.push(notification)
    }
  }

  // Sort by newest first
  userNotifications.sort((a, b) => b.created - a.created)

  return res.send({ success: true, notifications: userNotifications })
}
