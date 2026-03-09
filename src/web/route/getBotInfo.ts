import { Manager } from '../../manager.js'
import Fastify from 'fastify'

export async function getBotInfo(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  res.send({
    id: client.user?.id,
    username: client.user?.username,
    avatar: client.user?.displayAvatarURL({ extension: 'png', size: 1024 }),
  })
}
