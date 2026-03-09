import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export const getAuthLogin = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const clientId = client.config.utilities.WEB_SERVER.client_id || client.user?.id
  const redirectUri = encodeURIComponent(
    `${client.config.utilities.WEB_SERVER.root_url || 'http://localhost:3000'}/v1/auth/callback`
  )
  const scope = encodeURIComponent('identify guilds')

  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`

  return res.redirect(url)
}
