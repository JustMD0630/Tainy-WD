
import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { Relationship } from '../../../database/schema/Relationship.js'

export const deleteRelationship = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
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

    const { relationshipId } = req.params as { relationshipId: string }

    const rel = await client.db.relationship.get(relationshipId) as Relationship | null
    
    if (!rel) return res.code(404).send({ error: 'Relationship not found' })

    // Verify ownership
    if (rel.requesterId !== myId && rel.recipientId !== myId) {
        return res.code(403).send({ error: 'Not your relationship' })
    }

    await client.db.relationship.delete(relationshipId)

    return res.send({ success: true })
  } catch (err) {
    client.logger.error('DeleteRelationship', err)
    return res.code(500).send({ error: 'Internal Server Error' })
  }
}
