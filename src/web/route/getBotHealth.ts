import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../manager.js'

export const getBotHealth = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  return res.send({
    success: true,
    status: 200,
    body: 'OK',
    uptime: process.uptime(),
  })
}
