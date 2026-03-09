import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export class GetUserHistory {
  constructor(protected client: Manager) {}

  async main(req: FastifyRequest, res: FastifyReply) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.code(401).send({ error: 'Unauthorized' })
    }
    const token = authHeader.split(' ')[1]

    const { targetUserId } = req.params as { targetUserId: string }

    try {
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
        })
        if (!userRes.ok) return res.code(401).send({ error: 'Invalid token' })
        const adminUser = await userRes.json()
        
        const isAdmin = this.client.owner === adminUser.id || (this.client.config.bot.ADMIN || []).includes(adminUser.id)
        if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })
        
        const allNotifications = await this.client.db.notification.all()
        const history = allNotifications
            .filter(n => n.value.userId === targetUserId && (
                n.value.type === 'warn' || 
                n.value.type === 'ban' || 
                n.value.type === 'mute' || 
                n.value.type === 'unban' || 
                // Legacy fallback for old notifications
                n.value.title.includes('Ban') || 
                n.value.title.includes('Mute') || 
                n.value.title.includes('Suspendida')
            ))
            .map(n => n.value)
            .sort((a, b) => b.created - a.created)
            
        return res.send(history)
    } catch (err) {
        this.client.logger.error('GetUserHistory', err)
        return res.code(500).send({ error: 'Internal Server Error' })
    }
  }
}
