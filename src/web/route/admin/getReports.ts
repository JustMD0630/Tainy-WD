import util from 'node:util'
import { Manager } from '../../../manager.js'
import Fastify from 'fastify'

export class GetAdminReports {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    // Auth Check (userId passed in query for simple check, ideally via session/header)
    const { userId } = req.query as { userId?: string }
    if (!userId) return res.code(401).send({ error: 'Unauthorized' })

    const isAdmin = this.client.owner === userId || (this.client.config.bot.ADMIN || []).includes(userId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })

    try {
        const allReports = await this.client.db.report.all()
        const pendingReports: any[] = []

        for (const entry of allReports) {
            const report = entry.value
            // Fetch all reports, frontend handles filtering
            const comment = await this.client.db.comment.get(report.commentId)
            const reporter = await this.client.users.fetch(report.reporterId).catch(() => null)
            
            let offender = null
            if (comment) {
                offender = await this.client.users.fetch(comment.userId).catch(() => null)
            } else if (report.commentId) {
                 // Try to fetch offender from report history if comment is gone? 
                 // Current schema doesn't store offenderId in report, only commentId.
                 // So if comment is deleted, we might lose offender ID unless we store it in report creation.
                 // For now, we handle null.
            }

            pendingReports.push({
                ...report,
                commentContent: comment?.content || '*Comentario eliminado*',
                reporterName: reporter?.username || 'Desconocido',
                reporterAvatar: reporter?.displayAvatarURL({ size: 64 }),
                offenderName: offender?.username || 'Desconocido',
                offenderId: comment?.userId || 'N/A',
                playlistId: comment?.playlistId
            })
        }

        // Sort by newest
        pendingReports.sort((a, b) => b.created - a.created)

        res.send({ success: true, reports: pendingReports })
    } catch (err) {
        this.client.logger.error('GetAdminReports', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
