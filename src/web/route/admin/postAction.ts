import util from 'node:util'
import { Manager } from '../../../manager.js'
import Fastify from 'fastify'
import { getAuthedUserId } from '../../util/auth.js'

import { Comment } from '../../../database/schema/Comment.js'
import { Notification } from '../../../database/schema/Notification.js'
import { randomUUID } from 'node:crypto'

export class PostAdminAction {
  constructor(protected client: Manager) {}

  async main(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    // Auth Check
    const userId = await getAuthedUserId(req)
    if (!userId) return res.code(401).send({ error: 'Unauthorized' })

    const isAdmin = this.client.owner === userId || (this.client.config.bot.ADMIN || []).includes(userId)
    if (!isAdmin) return res.code(403).send({ error: 'Forbidden' })

    const { action, reportId, commentId, duration, banLevel, reason, targetUserId } = req.body as { 
        action: 'dismiss' | 'delete_comment' | 'ban_user' | 'restore' | 'mute_user' | 'warn_user' | 'unban_user', 
        reportId?: string, 
        commentId?: string,
        targetUserId?: string,
        duration?: number // Duration in hours for mute/ban
        banLevel?: number
        reason?: string
    }

    try {
        if (action === 'dismiss' && reportId) {
            const report = await this.client.db.report.get(reportId)
            if (report) {
                report.status = 'dismissed'
                await this.client.db.report.set(reportId, report)
                
                // If comment exists, decrease report count and unhide if < 5
                if (report.commentId) {
                    const comment = await this.client.db.comment.get(report.commentId) as Comment | null
                    if (comment) {
                        comment.reportCount = Math.max(0, (comment.reportCount || 0) - 1)
                        if (comment.reportCount < 5) {
                            comment.hidden = false
                        }
                        await this.client.db.comment.set(report.commentId, comment)
                    }
                }
            }
        } else if (action === 'restore') {
            const report = await this.client.db.report.get(reportId)
            if (report) {
                report.status = 'pending'
                await this.client.db.report.set(reportId, report)
                
                if (report.commentId) {
                    const comment = await this.client.db.comment.get(report.commentId) as Comment | null
                    if (comment) {
                        comment.reportCount = (comment.reportCount || 0) + 1
                        if (comment.reportCount >= 5) {
                            comment.hidden = true
                        }
                        await this.client.db.comment.set(report.commentId, comment)
                    }
                }
            }
        } else if (action === 'delete_comment') {
            if (commentId) {
                await this.client.db.comment.delete(commentId)
            }
            // Mark report as resolved if exists
            if (reportId) {
                const report = await this.client.db.report.get(reportId)
                if (report) {
                    report.status = 'resolved'
                    await this.client.db.report.set(reportId, report)
                }
            }
        } else if (['ban_user', 'mute_user', 'warn_user', 'unban_user'].includes(action)) {
            let offenderId: string | null = targetUserId || null
            
            // Try to find offender from report if not provided directly
            if (!offenderId && reportId) {
                const report = await this.client.db.report.get(reportId)
                if (report && report.commentId) {
                    const comment = await this.client.db.comment.get(report.commentId)
                    if (comment) offenderId = comment.userId
                }
            }

            if (offenderId) {
                let user = await this.client.db.user.get(offenderId)
                if (!user) {
                    user = {
                        id: offenderId,
                        banned: false,
                        muted: false,
                        warns: 0,
                        created: Date.now()
                    }
                }

                if (action === 'ban_user') {
                    user.banned = true
                    user.banLevel = banLevel || 1
                    user.banReason = reason
                    user.banExpires = duration ? Date.now() + (duration * 60 * 60 * 1000) : 0
                } else if (action === 'mute_user') {
                    user.muted = true
                    if (duration) {
                        user.mutedUntil = Date.now() + (duration * 60 * 60 * 1000)
                    }
                } else if (action === 'warn_user') {
                    user.warns = (user.warns || 0) + 1
                } else if (action === 'unban_user') {
                    user.banned = false
                    user.banLevel = 0
                    user.banReason = undefined
                    user.banExpires = 0
                }

                await this.client.db.user.set(offenderId, user)

                // Send Notification
                const notificationId = randomUUID()
                let notifType: 'warn' | 'ban' | 'mute' | 'unban' | 'success' = 'warn'
                
                if (action === 'ban_user') notifType = 'ban'
                else if (action === 'mute_user') notifType = 'mute'
                else if (action === 'unban_user') notifType = 'unban'
                
                const notification: Notification = {
                    id: notificationId,
                    userId: offenderId,
                    type: notifType,
                    title: action === 'warn_user' ? 'Advertencia' : 
                           action === 'mute_user' ? 'Silenciado' : 
                           action === 'unban_user' ? 'Suspensión Revocada' : 'Cuenta Suspendida',
                    message: action === 'warn_user' 
                        ? 'Has recibido una advertencia por infringir las normas de la comunidad.' 
                        : action === 'mute_user' 
                        ? `Has sido silenciado ${duration ? `por ${duration} horas` : 'indefinidamente'} debido a un reporte.`
                        : action === 'unban_user'
                        ? 'Tu suspensión ha sido revocada. Ya puedes acceder nuevamente.'
                        : `Tu cuenta ha sido suspendida (Nivel ${banLevel}). Motivo: ${reason || 'Violación de normas'}. Duración: ${duration ? `${duration} horas` : 'Permanente'}.`,
                    read: false,
                    created: Date.now()
                }
                await this.client.db.notification.set(notificationId, notification)

                // Send DM to user
                try {
                    const discordUser = await this.client.users.fetch(offenderId)
                    if (discordUser) {
                        await discordUser.send({
                            embeds: [{
                                title: `🔔 ${notification.title}`,
                                description: notification.message,
                                color: action === 'warn_user' ? 0xF59E0B : action === 'mute_user' ? 0xF97316 : action === 'unban_user' ? 0x10B981 : 0xEF4444,
                                footer: { text: 'Notificación automática de Tainy' },
                                timestamp: new Date().toISOString()
                            }]
                        })
                    }
                } catch (err) {
                    this.client.logger.warn('PostAdminAction', `Failed to send DM to ${offenderId}: ${err}`)
                }
                
                // Resolve report if exists
                if (reportId) {
                    const report = await this.client.db.report.get(reportId)
                    if (report) {
                        report.status = 'resolved'
                        await this.client.db.report.set(reportId, report)
                        
                        // Optionally delete comment on ban
                        if (action === 'ban_user' && report.commentId) {
                            await this.client.db.comment.delete(report.commentId)
                        }
                    }
                }
            }
        }

        res.send({ success: true })
    } catch (err) {
        this.client.logger.error('PostAdminAction', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
