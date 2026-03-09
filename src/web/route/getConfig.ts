import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../manager.js'

export const getConfig = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  // Return public config safe for frontend
  const config = {
    botBaseUrl: client.config.utilities.WEB_SERVER.root_url || '',
    botAuthToken: '', // Don't expose secret token
    botWsUrl: '',
    defaultGuildId: '',
    defaultUserId: '',
    botOwnerId: client.config.bot.OWNER_ID,
    botAdmins: client.config.bot.ADMIN || [],
  }
  return res.send({ success: true, config })
}
