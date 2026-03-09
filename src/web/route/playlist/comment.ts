
import util from 'node:util'
import { Manager } from '../../../manager.js'
import Fastify from 'fastify'
import { Comment } from '../../../database/schema/Comment.js'
import { Report } from '../../../database/schema/Report.js'
import { Playlist } from '../../../database/schema/Playlist.js'
import { randomUUID } from 'node:crypto'
import { EmbedBuilder, TextChannel } from 'discord.js'
import { getUserBadgeInfo } from '../../util/getUserBadgeInfo.js'

// Simple bad word list (expand as needed)
const BAD_WORDS = ['puto', 'mierda', 'verga', 'pendejo', 'estupido', 'idiota', 'marico', 'zorra', 'fuck', 'shit', 'bitch', 'asshole']

export class PlaylistComments {
  constructor(protected client: Manager) {}

  async getComments(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    const { id } = req.params as { id: string }
    
    try {
        const allComments = await this.client.db.comment.all()
        const playlistComments: any[] = []

        for (const entry of allComments) {
            const comment = entry.value as Comment
            if (comment.playlistId === id) {
                // Auto-fix hidden status consistency
                if (comment.hidden && (comment.reportCount || 0) < 5) {
                    comment.hidden = false
                    // Update DB asynchronously to fix persistence
                    this.client.db.comment.set(comment.id, comment).catch(err => 
                        this.client.logger.error('PlaylistComments', `Failed to auto-fix hidden status for comment ${comment.id}: ${err}`)
                    )
                } else if (!comment.hidden && (comment.reportCount || 0) >= 5) {
                    comment.hidden = true
                    // Update DB asynchronously to fix persistence
                    this.client.db.comment.set(comment.id, comment).catch(err => 
                        this.client.logger.error('PlaylistComments', `Failed to auto-fix hidden status for comment ${comment.id}: ${err}`)
                    )
                }

                // Fetch user info
                let userInfo = {
                    id: comment.userId,
                    username: 'Usuario',
                    avatar: null as string | null,
                    isOwner: false,
                    isAdmin: false,
                    isPremium: false
                }
                
                try {
                    const user = await this.client.users.fetch(comment.userId)
                    if (user) {
                        userInfo.username = user.username
                        userInfo.avatar = user.displayAvatarURL({ size: 128 })
                    }

                    const badgeInfo = await getUserBadgeInfo(this.client, comment.userId)
                    Object.assign(userInfo, badgeInfo)
                } catch (e) {}

                playlistComments.push({
                    ...comment,
                    userInfo
                })
            }
        }

        // Sort by newest first
        playlistComments.sort((a, b) => b.created - a.created)

        res.send({ success: true, comments: playlistComments })
    } catch (err) {
        this.client.logger.error('PlaylistComments', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }

  async postComment(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    const { id } = req.params as { id: string }
    const { content, userId } = req.body as { content: string, userId: string }

    if (!content || !userId) {
        return res.code(400).send({ error: 'Missing content or userId' })
    }

    // Check if user is banned or muted
    const user = await this.client.db.user.get(userId)
    if (user) {
        if (user.banned) return res.code(403).send({ error: 'Tu cuenta ha sido suspendida permanentemente.' })
        if (user.muted) {
             if (user.mutedUntil && Date.now() < user.mutedUntil) {
                 return res.code(403).send({ error: `Estás silenciado hasta ${new Date(user.mutedUntil).toLocaleString()}` })
             } else if (user.mutedUntil && Date.now() >= user.mutedUntil) {
                 // Unmute automatically
                 user.muted = false
                 user.mutedUntil = undefined
                 await this.client.db.user.set(userId, user)
             } else {
                 return res.code(403).send({ error: 'Has sido silenciado indefinidamente.' })
             }
        }
    }
    
    // Check if playlist has comments disabled
    const playlist = await this.client.db.playlist.get(id)
    if (playlist && playlist.commentsDisabled) {
        return res.code(403).send({ error: 'Los comentarios están desactivados en esta playlist.' })
    }

    if (content.length > 500) {
        return res.code(400).send({ error: 'Comment too long (max 500 chars)' })
    }

    // Bad word filter
    const lowerContent = content.toLowerCase()
    if (BAD_WORDS.some(word => lowerContent.includes(word))) {
        return res.code(400).send({ error: 'Tu comentario contiene lenguaje inapropiado.' })
    }

    try {
        const commentId = randomUUID()
        const newComment: Comment = {
            id: commentId,
            playlistId: id,
            userId: userId,
            content: content,
            created: Date.now()
        }

        await this.client.db.comment.set(commentId, newComment)
        res.send({ success: true, comment: newComment })
    } catch (err) {
        this.client.logger.error('PlaylistComments', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }

  async deleteComment(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    const { commentId } = req.params as { commentId: string }
    const { userId } = req.body as { userId: string }

    try {
        const comment = await this.client.db.comment.get(commentId) as Comment | null
        
        if (!comment) {
            return res.code(404).send({ error: 'Comment not found' })
        }

        // Check permission: Author or Admin/Owner
        const isAdmin = this.client.owner === userId || (this.client.config.bot.ADMIN || []).includes(userId)
        
        if (comment.userId !== userId && !isAdmin) {
            return res.code(403).send({ error: 'Unauthorized' })
        }

        await this.client.db.comment.delete(commentId)
        res.send({ success: true })
    } catch (err) {
        this.client.logger.error('PlaylistComments', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }

  async reportComment(req: Fastify.FastifyRequest, res: Fastify.FastifyReply) {
    const { commentId } = req.params as { commentId: string }
    const { reporterId, reason } = req.body as { reporterId: string, reason: string }

    if (!reason) return res.code(400).send({ error: 'Reason required' })

    try {
        const reportId = randomUUID()
        const newReport: Report = {
            id: reportId,
            commentId,
            reporterId,
            reason,
            created: Date.now(),
            status: 'pending'
        }

        await this.client.db.report.set(reportId, newReport)
        
        // Increase report count
        const comment = await this.client.db.comment.get(commentId) as Comment | null
        if (comment) {
            comment.reportCount = (comment.reportCount || 0) + 1
            if (comment.reportCount >= 5) {
                comment.hidden = true
            }
            await this.client.db.comment.set(commentId, comment)
        }

        // Send to Admin Log Channel
        const logChannelId = this.client.config.utilities.REPORT_LOG_CHANNEL
        if (logChannelId) {
            try {
                const channel = await this.client.channels.fetch(logChannelId) as TextChannel
                if (channel) {
                    const comment = await this.client.db.comment.get(commentId) as Comment
                    const reporter = await this.client.users.fetch(reporterId)
                    const offender = comment ? await this.client.users.fetch(comment.userId) : null
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🚨 Nuevo Reporte de Comentario')
                        .setColor('Red')
                        .addFields(
                            { name: 'Reportado por', value: `${reporter?.username || reporterId} (\`${reporterId}\`)`, inline: true },
                            { name: 'Usuario Reportado', value: `${offender?.username || 'Desconocido'} (\`${comment?.userId || 'N/A'}\`)`, inline: true },
                            { name: 'Motivo', value: reason },
                            { name: 'Contenido del Comentario', value: comment?.content || '*Contenido no encontrado*' },
                            { name: 'ID Reporte', value: reportId },
                            { name: 'ID Comentario', value: commentId }
                        )
                        .setTimestamp()

                    await channel.send({ embeds: [embed] })
                }
            } catch (error) {
                this.client.logger.error('PlaylistComments', `Failed to send report log: ${error}`)
            }
        }
        
        res.send({ success: true })
    } catch (err) {
        this.client.logger.error('PlaylistComments', err)
        res.code(500).send({ success: false, error: 'Internal Server Error' })
    }
  }
}
