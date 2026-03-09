import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../manager.js'
import { UserData } from '../../database/schema/User.js'

export const postUserSettings = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
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
      const discordUser = await userRes.json()
      
      const body = req.body as { dashboardLanguage?: string }
      const dashboardLanguage = body?.dashboardLanguage

      // Get existing user or create default
      let user = await client.db.user.get(discordUser.id)
      
      if (!user) {
          user = {
              id: discordUser.id,
              banned: false,
              muted: false,
              warns: 0,
              created: Date.now()
          }
      }

      if (dashboardLanguage) {
          user.dashboardLanguage = dashboardLanguage
          await client.db.user.set(discordUser.id, user)
      }

      return res.send({ success: true, dashboardLanguage })
  } catch (err) {
      client.logger.error('PostUserSettings', err)
      return res.code(500).send({ error: 'Internal Server Error' })
  }
}
