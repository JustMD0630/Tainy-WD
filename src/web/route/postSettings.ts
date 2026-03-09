import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../manager.js'

export const postSettings = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const { guildId } = req.params as { guildId: string }
  const { prefix, language } = req.body as { prefix?: string; language?: string }

  if (!guildId) {
    return res.code(400).send({ error: 'Missing guildId' })
  }

  // Update Prefix Table
  if (prefix) {
    await client.db.prefix.set(guildId, {
      guildId,
      prefix: prefix,
    })
  }

  // Update Language Table
  if (language) {
    await client.db.language.set(guildId, {
      guildId,
      language: language,
    })
  }

  return res.send({ success: true, prefix, language })
}
