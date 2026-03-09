
import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'
import { Relationship } from '../../../database/schema/Relationship.js'
import { UserData } from '../../../database/schema/User.js'

export const getFriends = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
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

    const allRels = await client.db.relationship.all()
    const allUsers = await client.db.user.all()
    
    // Helper to get user info
    const getUserInfo = async (userId: string) => {
        // Since UserData doesn't have username/avatar, we should try to fetch from Discord cache or API if possible
        // But for speed, let's just return ID for now and let frontend fetch details if needed
        // OR we can fetch from Discord API here if we have a bot token
        
        let username = 'Unknown User'
        let avatar = null
        let discriminator = '0'

        try {
            // Try to fetch from Discord API using Bot Token
            const botToken = client.config.bot.TOKEN
            const res = await fetch(`https://discord.com/api/users/${userId}`, {
                headers: { Authorization: `Bot ${botToken}` }
            })
            if (res.ok) {
                const u = await res.json()
                username = u.username
                avatar = u.avatar
                discriminator = u.discriminator
            }
        } catch (e) {
            // Ignore error
        }

        return {
            id: userId,
            username,
            avatar,
            discriminator
        }
    }

    const friends: any[] = []
    const pending: any[] = []
    const sent: any[] = []
    const blocked: any[] = []

    for (const entry of allRels) {
        const r = entry.value as Relationship
        if (r.status === 'ACCEPTED') {
            if (r.requesterId === myId || r.recipientId === myId) {
                const otherId = r.requesterId === myId ? r.recipientId : r.requesterId
                friends.push({ ...r, user: await getUserInfo(otherId) })
            }
        } else if (r.status === 'PENDING') {
            if (r.recipientId === myId) {
                pending.push({ ...r, user: await getUserInfo(r.requesterId) })
            } else if (r.requesterId === myId) {
                sent.push({ ...r, user: await getUserInfo(r.recipientId) })
            }
        } else if (r.status === 'BLOCKED') {
            if (r.requesterId === myId) { // I blocked them
                blocked.push({ ...r, user: await getUserInfo(r.recipientId) })
            }
        }
    }

    return res.send({
        success: true,
        data: {
            friends,
            pending,
            sent,
            blocked
        }
    })
  } catch (err) {
    client.logger.error('GetFriends', err)
    return res.code(500).send({ error: 'Internal Server Error' })
  }
}
