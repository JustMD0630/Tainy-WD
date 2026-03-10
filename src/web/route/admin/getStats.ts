import util from 'node:util'
import os from 'node:os'
import pidusage from 'pidusage'
import { Manager } from '../../../manager.js'
import Fastify from 'fastify'

import { getAuthedUserId } from '../../util/auth.js'

export class GetAdminStats {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    // Auth Check
    const authedUserId = await getAuthedUserId(req)
    if (!authedUserId) return res.code(401).send({ error: 'Unauthorized' })

    const isAdmin = this.client.owner === authedUserId || (this.client.config.bot.ADMIN || []).includes(authedUserId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })

    try {
        const playlists = await this.client.db.playlist.all()
        const comments = await this.client.db.comment.all()
        const reports = await this.client.db.report.all()
        
        // Count users (unique owners of playlists + commenters)
        const userSet = new Set<string>()
        playlists.forEach(p => p.value && userSet.add(p.value.owner))
        comments.forEach(c => c.value && userSet.add(c.value.userId))

        // Get System Stats via pidusage
        let stats
        try {
            stats = await pidusage(process.pid)
        } catch (e) {
            // Fallback for Windows/environments where wmic is missing
            const mem = process.memoryUsage()
            stats = {
                cpu: 0, // Cannot reliably get CPU usage without native modules on Windows
                memory: mem.rss,
                ppid: process.ppid,
                pid: process.pid,
                ctime: 0,
                elapsed: 0,
                timestamp: Date.now()
            }
        }
        
        // Get Lavalink Nodes
        const rainlinkNodes = this.client.rainlink.nodes as any
        const nodesIterable = typeof rainlinkNodes.values === 'function' 
            ? rainlinkNodes.values() 
            : rainlinkNodes.values || []
            
        const nodes = Array.from(nodesIterable).map((node: any) => ({
            name: node.options?.name,
            host: node.options?.host,
            port: node.options?.port,
            state: node.state, // 0: CONNECTED, 1: DISCONNECTED, etc. (Check Rainlink enum)
            stats: node.stats
        }))

        const adminStats = {
            // General
            totalPlaylists: playlists.length,
            publicPlaylists: playlists.filter(p => p.value && !p.value.private).length,
            totalComments: comments.length,
            totalReports: reports.length,
            pendingReports: reports.filter(r => r.value && r.value.status === 'pending').length,
            totalUsers: userSet.size, // Approximate active users
            botGuilds: this.client.guilds.cache.size,
            botUsers: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            uptime: process.uptime(),
            
            // System
            system: {
                cpu: stats.cpu,
                memory: stats.memory,
                memoryTotal: os.totalmem(),
                uptime: os.uptime(),
                platform: os.platform(),
                cores: os.cpus().length
            },

            // Lavalink
            nodes: nodes
        }

        res.send({ success: true, stats: adminStats })
    } catch (err) {
        this.client.logger.error('GetAdminStats', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
