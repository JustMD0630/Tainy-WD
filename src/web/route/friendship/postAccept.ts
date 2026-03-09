
import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { Relationship } from '../../../database/schema/Relationship.js'
import { Notification } from '../../../database/schema/Notification.js'
import { randomUUID } from 'node:crypto'

export const postAccept = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
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
    const me = await userRes.json()
    const myId = me.id

    const { requestId } = req.params as { requestId: string }
    let idToUse = requestId

    // Debug Log
    client.logger.info('FriendAccept', `User ${myId} attempting to accept request ${requestId}`)

    // Check if requestId is a valid key in DB, if not try to find it by id property
    let relationship = await client.db.relationship.get(requestId) as Relationship | null
    
    if (!relationship) {
        // Fallback: search all (inefficient but works if key != id)
        const all = await client.db.relationship.all()
        const found = all.find(r => (r.value as Relationship).id === requestId)
        if (found) {
            relationship = found.value as Relationship
            idToUse = found.id // Update idToUse to the actual key
            client.logger.info('FriendAccept', `Found relationship by value search. Key: ${idToUse}`)
        }
    }

    if (!relationship) {
        client.logger.warn('FriendAccept', `Request ${requestId} not found in DB`)
        return res.code(404).send({ error: 'Request not found' })
    }

    client.logger.info('FriendAccept', `Relationship found: ${JSON.stringify(relationship)}`)

    if (relationship.recipientId !== myId) {
        client.logger.warn('FriendAccept', `User ${myId} is not the recipient of request ${relationship.id} (recipient: ${relationship.recipientId})`)
        return res.code(403).send({ error: 'Not your request' })
    }

    if (relationship.status !== 'PENDING') {
        if (relationship.status === 'ACCEPTED') {
             return res.send({ success: true, relationship: relationship, message: 'Already accepted' })
        }
        client.logger.warn('FriendAccept', `Request ${relationship.id} is not PENDING (status: ${relationship.status})`)
        return res.code(400).send({ error: 'Request not pending' })
    }

    relationship.status = 'ACCEPTED'
    relationship.updatedAt = Date.now()

    // Use the correct key to update
    await client.db.relationship.set(idToUse, relationship)
    client.logger.info('FriendAccept', `Request ${relationship.id} accepted successfully`)

    // Create Notification for the requester (the person who sent the request)
    const notificationId = randomUUID()
    const notification: Notification = {
        id: notificationId,
        userId: relationship.requesterId, // Send to the requester
        type: 'success',
        title: 'Solicitud Aceptada',
        message: `${me.username} ha aceptado tu solicitud de amistad.`,
        read: false,
        created: Date.now()
    }
    
    await client.db.notification.set(notificationId, notification)
    client.logger.info('FriendAccept', `Notification sent to requester ${relationship.requesterId}`)

    return res.send({ success: true, relationship: relationship })
  } catch (err) {
    client.logger.error('FriendAccept', err)
    return res.code(500).send({ error: 'Internal Server Error' })
  }
}
