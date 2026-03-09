import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export class GetBannedUsers {
  constructor(protected client: Manager) {}

  async main(req: FastifyRequest, res: FastifyReply) {
    const { userId } = req.query as { userId: string }
    
    // Fallback to strict token check if userId not provided in query (but prefer query for consistency with other admin routes)
    if (!userId) {
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
            const adminUser = await userRes.json()
            return this.process(adminUser.id, res)
        } catch (e) {
            return res.code(500).send({ error: 'Failed to verify token' })
        }
    } else {
        return this.process(userId, res)
    }
  }

  async process(adminId: string, res: FastifyReply) {
    const isAdmin = this.client.owner === adminId || (this.client.config.bot.ADMIN || []).includes(adminId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })
    
    try {
        const allUsers = await this.client.db.user.all()
        const bannedUsers = allUsers.filter(u => u.value.banned || (u.value.banLevel && u.value.banLevel > 0))
        
        // Enrich with Discord data if possible (optional, might be slow)
        const enrichedUsers = await Promise.all(bannedUsers.map(async (u) => {
            const userData = {
                ...u.value,
                // Ensure banLevel 2 for legacy bans (banned=true, banLevel=undefined)
                // If banLevel exists, use it. If not, check banned flag.
                banLevel: u.value.banLevel || (u.value.banned ? 2 : 0),
                banReason: u.value.banReason || (u.value.banned ? 'Suspensión (Legacy)' : ''),
                banExpires: u.value.banExpires || 0 // Explicitly pass 0 if undefined for permanent
            }
            try {
                const discordUser = await this.client.users.fetch(u.value.id)
                return {
                    ...userData,
                    username: discordUser.username,
                    avatar: discordUser.avatar,
                    discriminator: discordUser.discriminator
                }
            } catch (e) {
                return userData
            }
        }))

        return res.send(enrichedUsers)
    } catch (err) {
        this.client.logger.error('GetBannedUsers', err)
        return res.code(500).send({ error: 'Internal Server Error' })
    }
  }
}
