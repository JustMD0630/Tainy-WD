
import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { Relationship } from '../../../database/schema/Relationship.js'
import { Notification } from '../../../database/schema/Notification.js'
import { randomUUID } from 'crypto'

export const postRequest = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.code(401).send({ error: 'Unauthorized' })
  }
  const token = authHeader.split(' ')[1]

  try {
    const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
    })
    if (!userRes.ok) return res.code(401).send({ error: 'Invalid token' })
    const requester = await userRes.json()
    const requesterId = requester.id

    const { targetId } = req.body as { targetId: string }

    if (!targetId) return res.code(400).send({ error: 'Target ID required' })
    if (requesterId === targetId) return res.code(400).send({ error: 'Cannot add yourself' })

    // Check existing relationship
    const allRels = await client.db.relationship.all()
    const existing = allRels.find(entry => {
        const r = entry.value as Relationship
        return (r.requesterId === requesterId && r.recipientId === targetId) ||
               (r.requesterId === targetId && r.recipientId === requesterId)
    })

    if (existing) {
        const r = existing.value as Relationship
        if (r.status === 'BLOCKED') return res.code(403).send({ error: 'Blocked' })
        if (r.status === 'ACCEPTED') return res.code(400).send({ error: 'Already friends' })
        if (r.status === 'PENDING') {
            if (r.requesterId === requesterId) return res.code(400).send({ error: 'Request already sent' })
            return res.code(400).send({ error: 'You have a pending request from this user' })
        }
    }

    const id = randomUUID()
    const rel: Relationship = {
        id,
        requesterId,
        recipientId: targetId,
        status: 'PENDING',
        createdAt: Date.now(),
        updatedAt: Date.now()
    }

    await client.db.relationship.set(id, rel)

    // Create Notification
    const notifId = randomUUID()
    const notif: Notification = {
        id: notifId,
        userId: targetId,
        type: 'info',
        title: 'New Friend Request',
        message: `${requester.username} sent you a friend request!`,
        read: false,
        created: Date.now()
    }
    await client.db.notification.set(notifId, notif)

    return res.send({ success: true, relationship: rel })
  } catch (err) {
    client.logger.error('FriendRequest', err)
    return res.code(500).send({ error: 'Internal Server Error' })
  }
}
