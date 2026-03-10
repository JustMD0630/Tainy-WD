import { Manager } from '../../../manager.js'
import Fastify from 'fastify'

import { getAuthedUserId } from '../../util/auth.js'

export class GetAdminHistoryUsers {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    // Auth Check
    const authedUserId = await getAuthedUserId(req)
    if (!authedUserId) return res.code(401).send({ error: 'Unauthorized' })

    const isAdmin = this.client.owner === authedUserId || (this.client.config.bot.ADMIN || []).includes(authedUserId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })

    try {
        const [allUsers, allNotifications] = await Promise.all([
            this.client.db.user.all(),
            this.client.db.notification.all()
        ])

        const userMap = new Map<string, any>()

        // Process User Data (Current Status)
        for (const user of allUsers) {
            if (user.value.warns > 0 || user.value.banned || user.value.muted || user.value.banLevel) {
                userMap.set(user.value.id, {
                    id: user.value.id,
                    warns: user.value.warns || 0,
                    banned: user.value.banned || false,
                    muted: user.value.muted || false,
                    banLevel: user.value.banLevel,
                    historyCount: 0,
                    lastInfraction: 0
                })
            }
        }

        // Process Notifications (History)
        for (const notif of allNotifications) {
            const n = notif.value
            if (
                n.type === 'warn' || 
                n.type === 'ban' || 
                n.type === 'mute' || 
                n.type === 'unban' ||
                // Legacy fallback
                n.title.toLowerCase().includes('ban') || 
                n.title.toLowerCase().includes('mute') || 
                n.title.toLowerCase().includes('suspendida')
            ) {
                if (!userMap.has(n.userId)) {
                    userMap.set(n.userId, {
                        id: n.userId,
                        warns: 0,
                        banned: false,
                        muted: false,
                        historyCount: 0,
                        lastInfraction: 0
                    })
                }

                const userData = userMap.get(n.userId)
                userData.historyCount++
                if (n.created > userData.lastInfraction) {
                    userData.lastInfraction = n.created
                }
            }
        }

        const users = Array.from(userMap.values())

        // Fetch Discord Info (Username/Avatar) - Limit concurrency or rely on cache
        // Using Promise.all with cache check first
        const usersWithInfo = await Promise.all(users.map(async (u) => {
            let user = this.client.users.cache.get(u.id)
            if (!user) {
                try {
                    user = await this.client.users.fetch(u.id)
                } catch {
                    // Ignore fetch errors (user might be deleted or bot blocked)
                }
            }
            
            return {
                ...u,
                username: user ? user.username : 'Unknown User',
                avatar: user ? user.avatar : null,
                discriminator: user ? user.discriminator : '0000'
            }
        }))

        // Sort by last infraction descending
        usersWithInfo.sort((a, b) => b.lastInfraction - a.lastInfraction)

        res.send({ success: true, users: usersWithInfo })
    } catch (err) {
        this.client.logger.error('GetAdminHistoryUsers', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
